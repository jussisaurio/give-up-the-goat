import React, { useEffect, useState } from "react";
import { validateNickname } from "../common/toolbox";
import { formatNicknameValidationError } from "./format";

type Props = {
  current: string;
  onSubmit: (n: string) => void;
};

export const NicknameEditor = ({ current = "", onSubmit }: Props) => {
  const [nicknameInput, setNicknameInput] = useState(current);

  useEffect(() => {
    if (current) {
      setNicknameInput(current);
    }
  }, [current]);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    e.preventDefault();
    setNicknameInput(e.target.value);
  }

  function onSubmitClick(e: React.FormEvent) {
    e.preventDefault();
    if (validateNickname(nicknameInput).ok) {
      onSubmit(nicknameInput);
    }
  }

  const validation = validateNickname(nicknameInput);

  const className =
    "nicknameEditor" +
    (!validation.ok && validation.reason !== "EMPTY" ? " validationError" : "");

  const validationErrorReason = !validation.ok
    ? formatNicknameValidationError(validation)
    : "";

  return (
    <div className={className}>
      <div>Your nickname for this session is</div>
      <div>
        <strong>{current}</strong>
      </div>
      <form onSubmit={onSubmitClick} className="nicknameEditorForm">
        <input
          onChange={onChange}
          className="nicknameEditorInput"
          value={nicknameInput}
          placeholder="Type nickname here..."
          type="text"
        ></input>
        <button
          className="nicknameEditorButton"
          type="submit"
          disabled={!validation.ok}
        >
          Set Nickname
        </button>
      </form>

      {validationErrorReason && (
        <span className="validationErrorReason">{validationErrorReason}</span>
      )}
    </div>
  );
};
