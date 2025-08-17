import { useNavigate } from "react-router-dom";

export default function StageButton({ i }: { i: number }) {
  const navigate = useNavigate();

  const handleClick = (i: number, e: React.TouchEvent | React.MouseEvent) => {
    navigate(`/game/${i}`);
    e.preventDefault();
  };

  return (
    <span className="btn stage" onClick={(e) => handleClick(i, e)}>
      <div className="btnNum">{i}</div>
    </span>
  );
}
