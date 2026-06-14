import math
from harness import group_fold, log_loss, brier, fit_calibration, apply_calibration

# (matchId, fold) pairs printed by the TS groupFold (plan Task 2 Step 2).
EXPECTED = [
    (1, 4),
    (2, 1),
    (100, 2),
    (12345, 4),
    (999999, 4),
    (7187, 3),
    (826444, 1),
]


def test_group_fold_matches_typescript():
    for match_id, fold in EXPECTED:
        assert group_fold(match_id, 5) == fold


def test_log_loss_and_brier_basics():
    preds = [0.9, 0.1, 0.8, 0.2]
    labels = [1, 0, 1, 0]
    assert log_loss(preds, labels) < 0.25
    assert abs(brier(preds, labels) - 0.025) < 1e-9  # mean of 0.01,0.01,0.04,0.04


def test_calibration_is_monotone_and_maps_ends():
    preds = [0.1] * 100 + [0.9] * 100
    labels = [1] * 30 + [0] * 70 + [1] * 80 + [0] * 20  # obs 0.30 then 0.80
    cal = fit_calibration(preds, labels)
    assert all(cal["y"][i] <= cal["y"][i + 1] + 1e-12 for i in range(len(cal["y"]) - 1))
    assert abs(apply_calibration(cal, 0.1) - 0.30) < 0.05
    assert abs(apply_calibration(cal, 0.9) - 0.80) < 0.05


def test_apply_calibration_clamps_outside_knots():
    cal = {"x": [0.2, 0.8], "y": [0.25, 0.75]}
    assert apply_calibration(cal, 0.0) == 0.25
    assert apply_calibration(cal, 1.0) == 0.75
