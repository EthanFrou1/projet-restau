from enum import Enum

class Role(str, Enum):
    DEV = "DEV"
    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    READONLY = "READONLY"
