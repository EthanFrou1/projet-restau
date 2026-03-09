import base64
import json
import threading
import time

import httpx

from app.integrations.myrhis.config import MyRhisSettings, get_myrhis_settings


class MyRhisClientError(Exception):
    pass


class MyRhisConfigError(MyRhisClientError):
    pass


class MyRhisNotFoundError(MyRhisClientError):
    pass


class MyRhisClient:
    def __init__(self, settings: MyRhisSettings | None = None):
        try:
            self.settings = settings or get_myrhis_settings()
        except RuntimeError as exc:
            raise MyRhisConfigError(str(exc)) from exc

        self._token: str | None = None
        self._token_expiry_epoch = 0.0
        self._token_lock = threading.Lock()

    def get_restaurant_by_id(self, myrhis_id: int) -> dict[str, int | str]:
        # MyRHIS does not expose a direct "get restaurant by id" route in the shared collection,
        # so we scan the paginated restaurant list and stop as soon as the expected id is found.
        for page in range(self.settings.max_restaurant_pages):
            payload = self._request(
                method="GET",
                path="/v1/restaurants/getRestaurant",
                params={"page": page},
                authenticated=True,
            )
            restaurants = _extract_restaurants(payload)
            if not restaurants:
                break

            for restaurant in restaurants:
                if int(restaurant.get("idRestaurant", 0)) == myrhis_id:
                    return {
                        "myrhis_id": myrhis_id,
                        "name": str(restaurant.get("libelle", "")).strip(),
                    }

        raise MyRhisNotFoundError(f"MyRHIS restaurant {myrhis_id} not found")

    def get_restaurant_plannings(self, *, myrhis_id: int, date_value: str) -> object:
        return self._request(
            method="GET",
            path="/v1/plannings/getPlanningsByRestaurants",
            params={"date": date_value, "restaurantList": str(myrhis_id), "page": 0},
            authenticated=True,
        )

    def get_restaurant_clockings(self, *, myrhis_id: int, date_value: str) -> object:
        return self._request(
            method="GET",
            path="/v1/clockings/getClockingsByRestaurants",
            params={"date": date_value, "restaurantList": str(myrhis_id), "page": 0},
            authenticated=True,
        )

    def _request(
        self,
        *,
        method: str,
        path: str,
        params: dict[str, object] | None = None,
        authenticated: bool,
    ) -> object:
        headers = {"Accept": "application/json", "x-api-key": self.settings.api_key}
        if authenticated:
            headers["token"] = self._get_token()

        try:
            with httpx.Client(base_url=self.settings.base_url, timeout=self.settings.timeout_seconds) as client:
                response = client.request(method=method, url=path, params=params, headers=headers)
                response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            body = exc.response.text.strip()
            detail = body[:300] if body else str(exc)
            raise MyRhisClientError(f"MyRHIS HTTP error on {path}: {detail}") from exc
        except httpx.HTTPError as exc:
            raise MyRhisClientError(f"MyRHIS request failed on {path}: {exc}") from exc

        return response.json()

    def _get_token(self) -> str:
        if self._token and time.time() < self._token_expiry_epoch:
            return self._token

        with self._token_lock:
            if self._token and time.time() < self._token_expiry_epoch:
                return self._token

            token = self._authenticate()
            self._token = token
            self._token_expiry_epoch = _extract_token_expiry(token)
            return token

    def _authenticate(self) -> str:
        try:
            with httpx.Client(base_url=self.settings.base_url, timeout=self.settings.timeout_seconds) as client:
                response = client.get(
                    "/v1/token/auth",
                    params={
                        "username": self.settings.username,
                        "password": self.settings.password,
                    },
                    headers={
                        "Accept": "application/json",
                        "x-api-key": self.settings.api_key,
                    },
                )
                response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            body = exc.response.text.strip()
            detail = body[:300] if body else str(exc)
            raise MyRhisClientError(f"MyRHIS authentication failed: {detail}") from exc
        except httpx.HTTPError as exc:
            raise MyRhisClientError(f"MyRHIS authentication request failed: {exc}") from exc

        token = _extract_text_token(response)
        if not token.strip():
            raise MyRhisClientError("MyRHIS authentication returned an invalid token")
        if token.count(".") != 2:
            raise MyRhisClientError(f"MyRHIS authentication did not return a JWT token: {token}")
        return token


def _extract_token_expiry(token: str) -> float:
    try:
        payload_segment = token.split(".")[1]
        payload_segment += "=" * (-len(payload_segment) % 4)
        payload_bytes = base64.urlsafe_b64decode(payload_segment.encode("utf-8"))
        payload = json.loads(payload_bytes.decode("utf-8"))
        expiry = float(payload.get("exp", 0))
        if expiry <= 0:
            raise ValueError("Missing exp")
        # Refresh a little before the real expiry to avoid edge cases on concurrent requests.
        return max(0.0, expiry - 30)
    except Exception:
        return time.time() + 300


def _extract_text_token(response: httpx.Response) -> str:
    raw_body = response.text.strip()
    if not raw_body:
        return ""

    try:
        parsed = response.json()
        if isinstance(parsed, str):
            return parsed.strip()
    except json.JSONDecodeError:
        pass

    return raw_body.strip().strip('"')


def _extract_restaurants(payload: object) -> list[dict]:
    if isinstance(payload, dict):
        restaurants = payload.get("restaurants")
        return restaurants if isinstance(restaurants, list) else []

    if isinstance(payload, list):
        for item in payload:
            if isinstance(item, dict):
                restaurants = item.get("restaurants")
                if isinstance(restaurants, list):
                    return restaurants

    raise MyRhisClientError("MyRHIS restaurant payload format is unsupported")
