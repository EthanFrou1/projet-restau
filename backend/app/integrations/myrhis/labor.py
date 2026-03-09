from typing import Any


def _time_to_minutes(value: str) -> int:
    hour_str, minute_str = value.split(":")[:2]
    hours = int(hour_str)
    minutes = int(minute_str)
    return hours * 60 + minutes


def _diff_minutes(start_value: str, end_value: str) -> int:
    start = _time_to_minutes(start_value)
    end = _time_to_minutes(end_value)
    if end < start:
        end += 24 * 60
    return max(0, end - start)


def build_labor_summary(*, plannings: object, clockings: object) -> dict[str, Any]:
    planned_by_employee: dict[int, dict[str, int]] = {}
    actual_by_employee: dict[int, dict[str, int]] = {}
    planned_shift_count = 0
    actual_clocking_count = 0

    for planning_day in plannings if isinstance(plannings, list) else []:
        restaurants = planning_day.get("restaurants", []) if isinstance(planning_day, dict) else []
        for restaurant in restaurants if isinstance(restaurants, list) else []:
            employees = restaurant.get("employees", []) if isinstance(restaurant, dict) else []
            for employee in employees if isinstance(employees, list) else []:
                employee_id = int(employee.get("idEmployee", 0)) if isinstance(employee, dict) else 0
                shifts = employee.get("shifts", []) if isinstance(employee, dict) else []
                for shift in shifts if isinstance(shifts, list) else []:
                    if not isinstance(shift, dict):
                        continue
                    start = shift.get("heureDebut")
                    end = shift.get("heureFin")
                    if not isinstance(start, str) or not isinstance(end, str):
                        continue
                    planned_shift_count += 1
                    minutes = _diff_minutes(start, end)
                    current = planned_by_employee.setdefault(employee_id, {"minutes": 0, "shifts": 0})
                    current["minutes"] += minutes
                    current["shifts"] += 1

    for clocking_day in clockings if isinstance(clockings, list) else []:
        restaurants = clocking_day.get("restaurants", []) if isinstance(clocking_day, dict) else []
        for restaurant in restaurants if isinstance(restaurants, list) else []:
            employees = restaurant.get("employees", []) if isinstance(restaurant, dict) else []
            for employee in employees if isinstance(employees, list) else []:
                employee_id = int(employee.get("idEmployee", 0)) if isinstance(employee, dict) else 0
                employee_clockings = employee.get("clockings", []) if isinstance(employee, dict) else []
                for clocking in employee_clockings if isinstance(employee_clockings, list) else []:
                    if not isinstance(clocking, dict):
                        continue
                    start = clocking.get("heure_debut_shift")
                    end = clocking.get("heure_fin_shift")
                    if not isinstance(start, str) or not isinstance(end, str):
                        continue
                    actual_clocking_count += 1
                    minutes = _diff_minutes(start, end)
                    current = actual_by_employee.setdefault(employee_id, {"minutes": 0, "clockings": 0})
                    current["minutes"] += minutes
                    current["clockings"] += 1

    planned_minutes = sum(item["minutes"] for item in planned_by_employee.values())
    actual_minutes = sum(item["minutes"] for item in actual_by_employee.values())
    planned_hours = planned_minutes / 60
    actual_hours = actual_minutes / 60

    return {
        "plannedEmployees": len(planned_by_employee),
        "actualEmployees": len(actual_by_employee),
        "plannedShiftCount": planned_shift_count,
        "actualClockingCount": actual_clocking_count,
        "plannedHours": planned_hours,
        "actualHours": actual_hours,
        "deltaHours": actual_hours - planned_hours,
        "plannedByEmployee": [
            {
                "employeeId": employee_id,
                "shifts": item["shifts"],
                "minutes": item["minutes"],
                "hours": item["minutes"] / 60,
            }
            for employee_id, item in planned_by_employee.items()
        ],
        "actualByEmployee": [
            {
                "employeeId": employee_id,
                "clockings": item["clockings"],
                "minutes": item["minutes"],
                "hours": item["minutes"] / 60,
            }
            for employee_id, item in actual_by_employee.items()
        ],
    }
