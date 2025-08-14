import { useNavigate } from "react-router-dom";

export default function StageButton({ i }: { i: number }) {
  const navigate = useNavigate();

  const handleClick = (i: number) => {
    navigate(`/game/${i}`);
  };

  return (
    <span className="btn stage" onClick={() => handleClick(i)}>
      <div className="stageNum">{i}</div>
    </span>
  );
}
