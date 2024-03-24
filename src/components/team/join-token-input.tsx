import { Input } from "@/components/ui/input";
import { useRef, useState } from "react";

export function JoinTokenInput({
  token,
  setToken,
}: {
  token: string[];
  setToken: (token: string[]) => void;
}) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]); // Refs for managing focus

  const handleChange = (index: number, char: string) => {
    const newToken = [...token];
    newToken[index] = char;
    setToken(newToken);

    // Focus management: move to next input on character entry, or stay for deletion
    if (char && index < 18) {
      inputRefs.current[index + 1]?.focus(); // Move focus to the next input
    } else if (!char && index > 0) {
      inputRefs.current[index - 1]?.focus(); // Move focus to the previous input on delete
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault(); // Prevent the default paste behavior

    const pasteData = e.clipboardData.getData("text").replace(/-/g, ""); // Remove dashes from the pasted data
    const newToken = [...token];
    const startIndex = newToken.findIndex(
      (char, index) =>
        char === "" && inputRefs.current[index] === e.currentTarget
    );

    // If startIndex is -1, it means no input is focused or all inputs are filled; default to 0 in such case
    const effectiveStartIndex = startIndex !== -1 ? startIndex : 0;
    let endIndex = effectiveStartIndex;

    // Distribute the paste data across the inputs, starting from the current focused input
    for (
      let i = 0;
      i < pasteData.length && effectiveStartIndex + i < newToken.length;
      i++
    ) {
      newToken[effectiveStartIndex + i] = pasteData[i];
      endIndex = effectiveStartIndex + i;
    }

    setToken(newToken);

    // Focus the next input slot if available, or the last slot if we've reached the end
    const nextIndex = Math.min(endIndex + 1, newToken.length - 1);
    inputRefs.current[nextIndex]?.focus();
  };

  return (
    <div className="flex items-center gap-1">
      {token.map((char, index) => (
        <>
          {index === 5 || index === 9 || index === 14 ? (
            <span key={char}>-</span>
          ) : null}{" "}
          {/* Add dashes visually */}
          <Input
            key={char}
            type="text"
            maxLength={1}
            value={char}
            onChange={(e) => handleChange(index, e.target.value.toLowerCase())}
            onPaste={handlePaste}
            ref={(el) => (inputRefs.current[index] = el)} // Assign ref for focus management
            className="w-10 text-center"
          />
        </>
      ))}
    </div>
  );
}
