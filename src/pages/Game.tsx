import { Application } from "pixi.js";
import { useEffect, useRef, useState } from "react";
import { RESOLUTION, STEP } from "../game/base";
import { useNavigate, useParams } from "react-router-dom";
import { loadStage, texts, update } from "../game/main";
import ArrowButton from "../components/ArrowButton";
import Checkbox from "../components/Checkbox";

export let app: Application; // pixiアプリケーション

export default function Game() {
  const id = Number(useParams().id) || 1;
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const [restarter, setRestarter] = useState(0);
  const [isComplete, SetIsComplete] = useState(false);
  const navigate = useNavigate();
  const isMobile =
    window.ontouchstart !== undefined && navigator.maxTouchPoints > 0; // タッチ端末判定
  // 更新
  let prevTime: number | undefined;
  let accumulator = 0;
  let dt: number;
  let loopId: number;
  const gameLoop = (timestamp: DOMHighResTimeStamp) => {
    if (prevTime !== undefined) {
      dt = Math.min(timestamp - prevTime, 100);
    }
    accumulator += dt ? dt : 0;
    while (accumulator >= STEP) {
      update(() => SetIsComplete(true));
      accumulator -= STEP;
    }
    prevTime = timestamp;
    loopId = requestAnimationFrame(gameLoop);
  };
  useEffect(() => {
    SetIsComplete(false);
    app = new Application();
    let $can: HTMLCanvasElement;
    (async () => {
      // pixiアプリケーション作成
      await app.init({
        backgroundAlpha: 0,
        width: RESOLUTION,
        height: RESOLUTION,
        antialias: false,
      });
      $can = app.canvas;
      $can.id = "main";
      canvasWrapperRef.current?.appendChild($can);
    })();
    loadStage(id);
    requestAnimationFrame(gameLoop);
    return () => {
      window.cancelAnimationFrame(loopId);
      app.destroy(true, { children: true });
    };
  }, [id, restarter]);

  return (
    <div className="gameScreen backGround" ref={canvasWrapperRef}>
      <div className="stageNum">{id}</div>
      <div
        className="btn restart"
        onClick={(e) => {
          setRestarter(restarter + 1);
          e.preventDefault();
        }}
      >
        <img src="/restart.png" alt="" className="icon" />
      </div>
      <div
        className="btn menu"
        onClick={(e) => {
          navigate("/select-stage");
          e.preventDefault();
        }}
      >
        <img src="/menu.png" alt="" className="icon" />
      </div>
      <div className="guides">
        <Checkbox
          id="txtGuide"
          onChange={() => {
            texts.forEach((text) => (text.visible = !text.visible));
          }}
        >
          ヒント
        </Checkbox>
        {/* <label htmlFor="txtGuide">
          <input
            type="checkbox"
            name="txtGuide"
            id="txtGuide"
            checked
            // onChange={(e) => {
            //   texts.forEach((text) => (text.visible = e.target.checked));
            // }}
          />
          ヒント
        </label> */}
      </div>
      {isMobile && (
        <div className="controlBtns">
          <ArrowButton eventName="up"></ArrowButton>
          <ArrowButton eventName="down"></ArrowButton>
          <ArrowButton eventName="left"></ArrowButton>
          <ArrowButton eventName="right"></ArrowButton>
        </div>
      )}
      {isComplete && (
        <div className="complete">
          <div className="completeText">Stage Complete!</div>
          <div
            className="btn next"
            onClick={(e) => {
              navigate(`/game/${id + 1}`);
              e.preventDefault();
            }}
          >
            <img src="/next.png" alt="" className="icon" />
          </div>
        </div>
      )}
    </div>
  );
}
