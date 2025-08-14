import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();
  return (
    <div className="homeScreen backGround">
      <p className="title">Escape Game (仮)</p>
      <div
        className="btn start"
        onClick={() => {
          navigate("/select-stage");
        }}
      >
        <img src="/right.png" alt="" className="icon" />
      </div>
    </div>
  );
}
