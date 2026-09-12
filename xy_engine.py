"""
GENESIS VECTOR SCOPE - XY Engine Module
Transformations géométriques de la trajectoire vectorielle (rotation, échelle, inversion)
"""

import numpy as np

class VectorTrajectoryEngine:
    def __init__(self):
        self.rotation_deg = 0.0
        self.scale_x = 1.0
        self.scale_y = 1.0
        self.offset_x = 0.0
        self.offset_y = 0.0
        self.invert_x = False
        self.invert_y = False

    def set_rotation(self, deg: float):
        self.rotation_deg = float(deg)

    def set_invert_x(self, val: bool):
        self.invert_x = bool(val)

    def set_invert_y(self, val: bool):
        self.invert_y = bool(val)

    def transform(self, x: np.ndarray, y: np.ndarray):
        tx = x.copy()
        ty = y.copy()

        if self.invert_x:
            tx = -tx
        if self.invert_y:
            ty = -ty

        tx = tx * self.scale_x + self.offset_x
        ty = ty * self.scale_y + self.offset_y

        if self.rotation_deg != 0.0:
            rad = np.radians(self.rotation_deg)
            cos_r = np.cos(rad)
            sin_r = np.sin(rad)
            rot_x = tx * cos_r - ty * sin_r
            rot_y = tx * sin_r + ty * cos_r
            return rot_x, rot_y

        return tx, ty
