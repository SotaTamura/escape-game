import { Application, Container } from "pixi.js";
import { useEffect, useRef, useState } from "react";
import { RESOLUTION, STAGE_LEN, STEP } from "../constants";
import { useNavigate, useParams } from "react-router-dom";
import { loadStage, update, hint } from "../game/main";
import ArrowButton from "../components/ArrowButton";
import Checkbox from "../components/Checkbox";

export let app: Application; // pixiアプリケーション
export let debugContainer: Container;

export default function Game() {
    const id = Number(useParams().id);
    const canvasWrapperRef = useRef<HTMLDivElement>(null);
    const [restarter, setRestarter] = useState(0);
    const [isComplete, setIsComplete] = useState(false);
    const [isHintShowed, setIsHintShowed] = useState(false);
    const [isDebugShowed, setIsDebugShowed] = useState(false);
    const [hintText, setHintText] = useState("");
    const navigate = useNavigate();
    const isMobile = window.ontouchstart !== undefined && navigator.maxTouchPoints > 0; // タッチ端末判定

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
            update(() => setIsComplete(true));
            accumulator -= STEP;
        }
        prevTime = timestamp;
        loopId = requestAnimationFrame(gameLoop);
    };
    useEffect(() => {
        setIsComplete(false);
        setIsHintShowed(false);
        setIsDebugShowed(false);
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
            debugContainer = new Container();
            debugContainer.width = app.screen.width;
            debugContainer.height = app.screen.height;
            debugContainer.zIndex = 100;
            debugContainer.visible = false;
            app.stage.addChild(debugContainer);
            await loadStage(id);
            setHintText(hint);
            requestAnimationFrame(gameLoop);
        })();
        return () => {
            window.cancelAnimationFrame(loopId);
            app.destroy(true, { children: true });
        };
    }, [id, restarter]);

    useEffect(() => {
        if (debugContainer) {
            debugContainer.visible = isDebugShowed;
        }
    }, [isDebugShowed]);

    return (
        <div className="gameScreen backGround" ref={canvasWrapperRef}>
            <div className="stageNum">{id}</div>
            <div
                className="btn restart"
                onClick={(e) => {
                    setRestarter(restarter + 1);
                    e.preventDefault();
                }}>
                <img src="/restart.png" alt="" className="icon" />
            </div>
            <div
                className="btn menu"
                onClick={(e) => {
                    navigate("/select-stage");
                    e.preventDefault();
                }}>
                <img src="/menu.png" alt="" className="icon" />
            </div>
            <div className="guides">
                <div
                    className="miniBtn guide"
                    onClick={(e) => {
                        setIsHintShowed(true);
                        e.preventDefault();
                    }}>
                    ヒント
                </div>
                <Checkbox
                    id="debug"
                    checked={isDebugShowed}
                    onChange={() => {
                        setIsDebugShowed(!isDebugShowed);
                    }}
                    children={<span>当たり判定</span>}></Checkbox>
            </div>
            {isHintShowed && (
                <div
                    className="popup"
                    onClick={() => {
                        setIsHintShowed(false);
                    }}>
                    <div className="popupTitle">hint</div>
                    <div className="hintText">{hintText}</div>
                </div>
            )}
            {isMobile && (
                <div className="controlBtns">
                    <ArrowButton eventName="u"></ArrowButton>
                    <ArrowButton eventName="d"></ArrowButton>
                    <ArrowButton eventName="l"></ArrowButton>
                    <ArrowButton eventName="r"></ArrowButton>
                </div>
            )}
            {isComplete && (
                <div className="popup">
                    <div className="popupTitle">stage complete!</div>
                    {id === STAGE_LEN ? (
                        <div
                            className="btn next"
                            onClick={(e) => {
                                navigate("/select-stage");
                                e.preventDefault();
                            }}>
                            <img src="/menu.png" alt="" className="icon" />
                        </div>
                    ) : (
                        <div
                            className="btn next"
                            onClick={(e) => {
                                navigate(`/game/${id + 1}`);
                                e.preventDefault();
                            }}>
                            <img src="/next.png" alt="" className="icon" />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
