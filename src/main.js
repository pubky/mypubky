import "./styles.css";
import { MyPubkyApp } from "./app.js";

const root = document.querySelector("#app");
const app = new MyPubkyApp(root);

app.init();
