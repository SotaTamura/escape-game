import { Application } from "pixi.js";
import { useEffect, useRef, useState } from "react";
import { RESOLUTION, STEP } from "../game/base";
import { useNavigate, useParams } from "react-router-dom";
import { loadStage, update } from "../game/main";
import ArrowButton from "../components/ArrowButton";

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
    <>
      <div className="gameScreen backGround" ref={canvasWrapperRef}>
        <div className="stageNum">{id}</div>
        <div
          className="btn restart"
          onClick={() => setRestarter(restarter + 1)}
        >
          <img src="/restart.png" alt="" className="icon" />
        </div>
        <div
          className="btn menu"
          onClick={() => {
            navigate("/select-stage");
          }}
        >
          <img src="/menu.png" alt="" className="icon" />
        </div>

        {isMobile && (
          <>
            <ArrowButton eventName="up"></ArrowButton>
            <ArrowButton eventName="down"></ArrowButton>
            <ArrowButton eventName="left"></ArrowButton>
            <ArrowButton eventName="right"></ArrowButton>
          </>
        )}
        {isComplete && (
          <div className="complete">
            <div className="completeText">Stage Complete!</div>
            <div
              className="btn next"
              onClick={() => {
                navigate(`/game/${id + 1}`);
              }}
            >
              <img src="/next.png" alt="" className="icon" />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
