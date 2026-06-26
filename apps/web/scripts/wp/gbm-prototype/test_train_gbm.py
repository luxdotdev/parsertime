from train_gbm import choose_family


def _fam(kind, ll):
    return {"kind": kind, "metrics": {"logLoss": ll, "brier": 0.2, "baseRate": 0.5}}


def test_challenger_ships_when_better_and_gated():
    assert choose_family(_fam("gbm", 0.60), gbm_gate_pass=True, incumbent=_fam("lr", 0.62))["kind"] == "gbm"


def test_incumbent_kept_when_gbm_worse():
    out = choose_family(_fam("gbm", 0.63), gbm_gate_pass=True, incumbent=_fam("lr", 0.62))
    assert out["kind"] == "lr" and out["metrics"]["logLoss"] == 0.62


def test_incumbent_kept_when_gbm_fails_gate():
    assert choose_family(_fam("gbm", 0.50), gbm_gate_pass=False, incumbent=_fam("lr", 0.62))["kind"] == "lr"


def test_gbm_ships_when_no_incumbent():
    assert choose_family(_fam("gbm", 0.60), gbm_gate_pass=True, incumbent=None)["kind"] == "gbm"
