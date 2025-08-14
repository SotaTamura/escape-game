import { pressingEvent, pressStartEvent } from "../game/base";

export default function ArrowButton({ eventName }: { eventName: string }) {
  const HandleTouchStart = () => {
    pressingEvent[eventName] = true;
    pressStartEvent[eventName] = true;
  };
  const HandleTouchEnd = (e: React.TouchEvent) => {
    pressingEvent[eventName] = false;
    e.preventDefault();
  };

  return (
    <div
      className={`btn arrow ${eventName}`}
      onTouchStart={HandleTouchStart}
      onTouchEnd={HandleTouchEnd}
    >
      <img src={`/${eventName}.png`} alt="" className="icon" />
    </div>
  );
}
