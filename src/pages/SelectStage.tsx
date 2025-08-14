import { useNavigate } from "react-router-dom";
import StageButton from "../components/StageButton";
import { STAGE_LEN } from "../game/base";

export default function SelectStage() {
  const navigate = useNavigate();
  return (
    <div className="stageSelectScreen backGround">
      <div
        className="btn back"
        onClick={() => {
          navigate("/");
        }}
      >
        <img src="/left.png" alt="" className="icon" />
      </div>
      <div className="selectStageText">Select Stage</div>
      <div className="stageWrapperContainer">
        <div className="stageWrapper">
          {Array.from({ length: STAGE_LEN }, (_, k) => (
            <StageButton i={k + 1} key={k + 1}></StageButton>
          ))}
        </div>
      </div>
    </div>
  );
}
