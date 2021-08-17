import React from "react";
import { Card } from "../common/game";

const noop = () => {};

type Props = {
  card: { face: "DOWN" } | { face: "UP"; card: Card };
  className?: string;
  style?: any;
  disabled?: boolean;
  onClick: (...args: any) => void;
};

const BaseCard: React.FC<Omit<Props, "card">> = ({
  style,
  disabled,
  className,
  onClick,
  children
}) => (
  <div
    onClick={disabled ? noop : onClick}
    className={"card" + (className ? " " + className : "")}
    style={{
      ...(disabled && { opacity: "50%", cursor: "initial" }),
      ...style
    }}
  >
    {children}
  </div>
);

export const PlayingCard = ({
  card,
  className,
  style,
  disabled = false,
  onClick
}: Props) => {
  if (card.face === "DOWN") {
    return (
      <BaseCard
        onClick={onClick}
        disabled={disabled}
        className={className}
        style={{
          backgroundColor: "#654321",
          ...style
        }}
      >
        <span style={{ color: "white", fontSize: "2rem" }}>?</span>
      </BaseCard>
    );
  }

  if (card.card.type === "dual") {
    const [firstColor, secondColor] = card.card.colors;
    return (
      <BaseCard
        onClick={onClick}
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
        onClick={onClick}
        disabled={disabled}
        className={className}
        style={{
          backgroundColor: card.card.color,
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
        onClick={onClick}
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
      onClick={onClick}
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
