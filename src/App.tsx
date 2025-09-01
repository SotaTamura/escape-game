import "./App.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import SelectStage from "./pages/SelectStage";
import Game from "./pages/Game";
import { useEffect, useState } from "react";
import { onLoad } from "./game/base";

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    (async () => {
      await onLoad();
      setIsLoading(false);
    })();
  }, []);
  if (isLoading) {
    return <div className="backGround">Loading...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route index element={<Home></Home>}></Route>
        <Route path="select-stage" element={<SelectStage></SelectStage>}></Route>
        <Route path="game/:id" element={<Game></Game>}></Route>
        <Route path="*" element={<Home></Home>}></Route>
      </Routes>
    </BrowserRouter>
  );
}
