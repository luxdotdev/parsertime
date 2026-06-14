from harness import group_fold

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
