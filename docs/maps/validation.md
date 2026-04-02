# Validation

Validation ensures alignment is correct.

---

## Visual Overlay

Overlay:

- Player positions
- Known landmarks

---

## Expected Behavior

| Issue          | Symptom                 |
| -------------- | ----------------------- |
| Wrong scale    | stretched or compressed |
| Wrong rotation | diagonal drift          |
| Wrong origin   | offset mismatch         |

---

## Debug Strategy

1. Plot raw points
2. Plot known anchors
3. Adjust:
   - rotation first
   - then scale
   - then origin

---

## Recommended Tooling

- Canvas overlay
- Toggle debug grid
- Show anchor points
