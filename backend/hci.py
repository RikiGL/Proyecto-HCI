# =========================
# IMPORTS
# =========================
import serial
import threading
import time
import random
import joblib
import os

from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

# =========================
# CONFIG
# =========================
PORT = "COM7"
BAUD = 115200
MODEL_PATH = "modelo_rf.pkl"

# =========================
# SERIAL
# =========================
ser = serial.Serial(PORT, BAUD, timeout=1)
time.sleep(2)

# =========================
# CARGA DEL MODELO ML
# =========================
if not os.path.exists(MODEL_PATH):
    raise RuntimeError("❌ No existe modelo_rf.pkl. Entrena y guarda primero.")

modelo = joblib.load(MODEL_PATH)
print("🤖 Modelo ML cargado correctamente")

# =========================
# FASTAPI
# =========================
app = FastAPI(title="HCI Backend Integrado")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# ESTADO GLOBAL DEL JUEGO
# =========================
game_state = {
    "level": 1,
    "pattern": [],
    "user_input": [],
    "errors": 0,
    "start_time": None,
    "streak": 0,
    "status": "idle"  # idle, playing, success, failed
}

# =========================
# MODELOS Pydantic
# =========================
class StartRequest(BaseModel):
    level: int

# =========================
# FUNCIONES PRINCIPALES
# =========================
LEVEL_CONFIG = {
    1: {"length": 2},
    2: {"length": 3},
    3: {"length": 4},
    4: {"length": 5},
    5: {"length": 5},
}

def generar_patron(level: int):
    length = LEVEL_CONFIG[level]["length"]
    return [random.randint(1, 5) for _ in range(length)]


def enviar_patron_esp32(pattern):
    msg = "PATTERN:" + ",".join(map(str, pattern)) + "\n"
    ser.write(msg.encode())
    print("📤 Patrón enviado:", pattern)

def procesar_boton(btn: int):
    if game_state["status"] != "playing":
        return

    game_state["user_input"].append(btn)
    print(f"🎮 Botón recibido: {btn}")

    idx = len(game_state["user_input"]) - 1
    if game_state["pattern"][idx] != btn:
        game_state["errors"] += 1
        game_state["status"] = "failed"
        finalizar_ronda(False)
        return

    if len(game_state["user_input"]) == len(game_state["pattern"]):
        game_state["status"] = "success"
        finalizar_ronda(True)

def finalizar_ronda(success: bool):
    elapsed = int(time.time() - game_state["start_time"])
    aciertos = len(game_state["user_input"]) if success else len(game_state["user_input"]) - 1

    racha = game_state["streak"]
    if success:
        racha = racha + 1 if racha >= 0 else 1
    else:
        racha = racha - 1 if racha <= 0 else -1

    input_ml = [[
        game_state["level"],
        aciertos,
        game_state["errors"],
        elapsed,
        racha
    ]]

    accion = modelo.predict(input_ml)[0]
    print("🤖 ML decidió:", accion)

    if accion == "SUBIR":
        game_state["level"] = min(5, game_state["level"] + 1)
    elif accion == "BAJAR":
        game_state["level"] = max(1, game_state["level"] - 1)

    game_state["streak"] = racha

# =========================
# THREAD PARA ESCUCHAR ESP32
# =========================
def escuchar_serial():
    while True:
        if ser.in_waiting:
            line = ser.readline().decode().strip()
            if line.startswith("BTN:"):
                btn = int(line.split(":")[1])
                procesar_boton(btn)
        time.sleep(0.01)

threading.Thread(target=escuchar_serial, daemon=True).start()

# =========================
# ENDPOINTS
# =========================

@app.post("/start_game")
def start_game(data: StartRequest):
    game_state["level"] = data.level
    game_state["pattern"] = generar_patron(data.level)
    game_state["user_input"] = []
    game_state["errors"] = 0
    game_state["start_time"] = time.time()
    game_state["status"] = "playing"

    enviar_patron_esp32(game_state["pattern"])

    return {
        "status": "started",
        "level": game_state["level"],
        "length": len(game_state["pattern"])
    }

@app.get("/status")
def status():
    return game_state

@app.get("/")
def root():
    return {"status": "Backend integrado funcionando 🚀"}
