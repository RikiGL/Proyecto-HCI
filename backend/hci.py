# =========================
# IMPORTS
# =========================
import serial
import threading
import time
import random
import joblib
import os
import pandas as pd

from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

# =========================
# CONFIG
# =========================
PORT = "COM8"
BAUD = 115200
MODEL_PATH = "modelo_rf_new.pkl"

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
    "status": "idle"
}

# =========================
# CONFIGURACIÓN DE NIVELES
# =========================
LEVEL_CONFIG = {
    1: {"length": 2},
    2: {"length": 3},
    3: {"length": 4},
    4: {"length": 5},
    5: {"length": 5},
}

# =========================
# Pydantic
# =========================
class StartRequest(BaseModel):
    level: int

# =========================
# FUNCIONES
# =========================
def generar_patron(level: int):
    length = LEVEL_CONFIG[level]["length"]
    return [random.randint(1, 5) for _ in range(length)]


def enviar_patron_esp32(pattern):
    msg = "PATTERN:" + ",".join(map(str, pattern)) + "\n"
    ser.write(msg.encode())
    print("📤 Patrón enviado:", pattern)


def procesar_boton(btn: int):
    if game_state["start_time"] is None:
        game_state["start_time"] = time.time()

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


def escuchar_serial():
    while True:
        if ser.in_waiting:
            line = ser.readline().decode().strip()
            if line.startswith("BTN:"):
                btn = int(line.split(":")[1])
                procesar_boton(btn)

        time.sleep(0.01)


threading.Thread(target=escuchar_serial, daemon=True).start()


def iniciar_nueva_ronda():
    time.sleep(2)

    if game_state["status"] == "paused":
        return

    game_state["pattern"] = generar_patron(game_state["level"])
    game_state["user_input"] = []
    game_state["errors"] = 0
    game_state["start_time"] = time.time()
    game_state["status"] = "playing"

    enviar_patron_esp32(game_state["pattern"])


def finalizar_ronda(success: bool):
    elapsed = int(time.time() - game_state["start_time"])

    aciertos = len(game_state["user_input"]) if success else max(0, len(game_state["user_input"]) - 1)

    # actualizar racha
    racha = game_state["streak"]
    if success:
        racha = racha + 1 if racha >= 0 else 1
    else:
        racha = racha - 1 if racha <= 0 else -1

    largo_patron = len(game_state["pattern"])

    # ⚠️ IMPORTANTE: mismas columnas que el entrenamiento
    # Evitar división por cero
    accuracy = aciertos / largo_patron if largo_patron > 0 else 0

    tiempo_por_acierto = elapsed / aciertos if aciertos > 0 else elapsed

    input_ml = pd.DataFrame([{
        "Nivel": game_state["level"],
        "Largo_Patron": largo_patron,
        "Aciertos": aciertos,
        "Errores": game_state["errors"],
        "Accuracy": round(accuracy, 3),
        "Tiempo_por_Acierto": round(tiempo_por_acierto, 3),
        "Racha": racha
    }])



    accion = modelo.predict(input_ml)[0]

    print("\n📊 Input ML:")
    print(input_ml)
    print("🤖 Acción ML:", accion)

    # Log opcional
    with open("ml_input_log.csv", "a") as f:
        input_ml["Accion_ML"] = accion
        input_ml.to_csv(f, header=f.tell() == 0, index=False)

    # aplicar acción
    if accion == "SUBIR":
        game_state["level"] = min(5, game_state["level"] + 1)
    elif accion == "BAJAR":
        game_state["level"] = max(1, game_state["level"] - 1)

    game_state["streak"] = racha

    threading.Thread(target=iniciar_nueva_ronda, daemon=True).start()


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


@app.post("/pause")
def pause_game():
    game_state["status"] = "paused"
    return {"status": "paused"}
