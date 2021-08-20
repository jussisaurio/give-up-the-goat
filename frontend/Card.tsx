import React, { useEffect, useState } from "react";
import { Card } from "../common/game";
import { mapPlayerColorToUIColor } from "./format";

const noop = () => {};

type Props = {
  id?: string;
  card: { face: "DOWN" } | { face: "UP"; card: Card };
  className?: string;
  style?: any;
  disabled?: boolean;
  selectable?: boolean;
  onClick: (...args: any) => void;
};

const BaseCard: React.FC<Omit<Props, "card">> = ({
  id,
  style,
  disabled,
  className,
  selectable = false,
  onClick,
  children
}) => {
  const base = "card" + (className ? " " + className : "");
  const cls = !disabled && selectable ? "selectable " + base : base;

  const [animation, setAnimation] = useState<string | undefined>(
    style?.animation
  );

  useEffect(() => {
    if (!style?.animation) {
      setAnimation(undefined);
    } else {
      setAnimation(style.animation);
      setTimeout(() => {
        setAnimation(undefined);
      }, 600);
    }
  }, [style?.animation]);
  return (
    <div
      id={id}
      onClick={disabled ? noop : onClick}
      className={cls}
      style={{
        ...(disabled && { opacity: "50%", cursor: "initial" }),
        ...style,
        animation
      }}
    >
      {children}
    </div>
  );
};

export const PlayingCard = ({
  id,
  card,
  className,
  style,
  selectable = false,
  disabled = false,
  onClick
}: Props) => {
  if (card.face === "DOWN") {
    return (
      <BaseCard
        id={id}
        onClick={onClick}
        disabled={disabled}
        selectable={selectable}
        className={className}
        style={{
          backgroundColor: "#222",
          ...style
        }}
      >
        <span style={{ color: "white", fontSize: "1.2rem" }}>🔍</span>
      </BaseCard>
    );
  }

  if (card.card.type === "dual") {
    const [firstColor, secondColor] = card.card.colors.map(
      mapPlayerColorToUIColor
    );
    return (
      <BaseCard
        id={id}
        onClick={onClick}
        selectable={selectable}
        disabled={disabled}
        className={className}
        style={{
          backgroundImage: `linear-gradient(115deg, ${firstColor} 50%, ${secondColor} 50%)`,
          ...style
        }}
      >
        <img
          style={{ width: "75%", height: "auto" }}
          src="/assets/Stylized-Goat-Line-Art.svg"
        ></img>
      </BaseCard>
    );
  } else if (card.card.type === "single") {
    return (
      <BaseCard
        id={id}
        onClick={onClick}
        selectable={selectable}
        disabled={disabled}
        className={className}
        style={{
          backgroundColor: mapPlayerColorToUIColor(card.card.color),
          ...style
        }}
      >
        <img
          style={{ width: "75%", height: "auto" }}
          src="/assets/Stylized-Goat-Line-Art.svg"
        ></img>
      </BaseCard>
    );
  } else if (card.card.type === "neutral") {
    return (
      <BaseCard
        id={id}
        onClick={onClick}
        selectable={selectable}
        disabled={disabled}
        className={className}
        style={{
          backgroundColor: "grey",
          ...style
        }}
      >
        <img
          style={{ width: "75%", height: "auto" }}
          src="/assets/Neutral.svg"
        ></img>
      </BaseCard>
    );
  }

  return (
    <BaseCard
      id={id}
      onClick={onClick}
      selectable={selectable}
      disabled={disabled}
      className={className}
      style={{
        background: `linear-gradient(
        90deg,
        rgba(255, 0, 0, 1) 0%,
        rgba(255, 154, 0, 1) 10%,
        rgba(208, 222, 33, 1) 20%,
        rgba(79, 220, 74, 1) 30%,
        rgba(63, 218, 216, 1) 40%,
        rgba(47, 201, 226, 1) 50%,
        rgba(28, 127, 238, 1) 60%,
        rgba(95, 21, 242, 1) 70%,
        rgba(186, 12, 248, 1) 80%,
        rgba(251, 7, 217, 1) 90%,
        rgba(255, 0, 0, 1) 100%
    )`,
        ...style
      }}
    >
      <img
        style={{ width: "75%", height: "auto" }}
        src="/assets/Stylized-Goat-Line-Art.svg"
      ></img>
    </BaseCard>
  );
};
