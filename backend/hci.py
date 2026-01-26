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
import csv

from fastapi import FastAPI, Response # <--- IMPORTANTE: Importar Response
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

# =========================
# CONFIG
# =========================
PORT = "COM8"
BAUD = 115200
MODEL_PATH = "modelo_simon_v1.pkl"

# =========================
# SERIAL
# =========================
try:
    ser = serial.Serial(PORT, BAUD, timeout=1)
    time.sleep(2)
except Exception as e:
    print(f"⚠️ Error abriendo puerto serial: {e}")
    # Mock para pruebas si no hay hardware conectado
    class MockSerial:
        def write(self, x): pass
        def in_waiting(self): return False
    ser = MockSerial()

# =========================
# CARGA DEL MODELO ML
# =========================
if not os.path.exists(MODEL_PATH):
    print("⚠️ ADVERTENCIA: No existe modelo.pkl, usando lógica dummy.")
    modelo = None
else:
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

LEVEL_CONFIG = {
    1: {"length": 2},
    2: {"length": 3},
    3: {"length": 4},
    4: {"length": 5},
    5: {"length": 5},
}

class StartRequest(BaseModel):
    level: int

class PredictRequest(BaseModel):
    nivel: int
    aciertos: int
    errores: int
    tiempo: float
    racha: int

# =========================
# FUNCIONES AUXILIARES
# =========================
def generar_patron(level: int):
    # Fallback por seguridad si el nivel se sale de rango
    lvl = max(1, min(5, level))
    length = LEVEL_CONFIG[lvl]["length"]
    return [random.randint(1, 5) for _ in range(length)]

def enviar_patron_esp32(pattern):
    msg = "PATTERN:" + ",".join(map(str, pattern)) + "\n"
    if hasattr(ser, 'write'):
        ser.write(msg.encode())
    print("📤 Patrón enviado:", pattern)

def iniciar_nueva_ronda():
    time.sleep(2)
    if game_state["status"] == "paused":
        return

    # Generamos patrón con el nivel YA actualizado
    game_state["pattern"] = generar_patron(game_state["level"])
    game_state["user_input"] = []
    game_state["errors"] = 0
    game_state["start_time"] = time.time()
    game_state["status"] = "playing"

    enviar_patron_esp32(game_state["pattern"])

def finalizar_ronda(success: bool):
    # Solo actualizamos estado, el frontend dispara la predicción
    game_state["status"] = "success" if success else "failed"
    print(f"🏁 Ronda finalizada. Estado: {game_state['status']}")

def procesar_boton(btn: int):
    # Si está memorizando, ignoramos el botón
    if game_state["status"] != "playing":
        print(f"🚫 Botón {btn} ignorado (Fase: {game_state['status']})")
        return

    if game_state["start_time"] is None:
        game_state["start_time"] = time.time()

    if game_state["status"] != "playing":
        return

    game_state["user_input"].append(btn)
    print(f"🎮 Botón recibido: {btn}")

    idx = len(game_state["user_input"]) - 1
    
    # Validación de índice por seguridad
    if idx < len(game_state["pattern"]):
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
        try:
            if ser.in_waiting:
                line = ser.readline().decode().strip()
                if line.startswith("BTN:"):
                    btn = int(line.split(":")[1])
                    procesar_boton(btn)
        except Exception:
            pass
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
    game_state["start_time"] = None # No iniciamos tiempo aún
    game_state["status"] = "memorizing" # <--- ESTADO DE ESPERA

    enviar_patron_esp32(game_state["pattern"])
    
    return {"status": "memorizing", "level": game_state["level"]}

# 2. NUEVO ENDPOINT: Se llama justo cuando inicia la barra en el frontend
@app.post("/start_turn")
def start_turn():
    game_state["start_time"] = time.time() # <--- AQUI INICIA EL RELOJ REALMENTE
    game_state["status"] = "playing"       # <--- AHORA ACEPTAMOS INPUTS
    return {"status": "playing"}

@app.get("/status")
def status(response: Response):
    # 🔥 FIX: Deshabilitar caché del navegador para evitar que el frontend lea niveles viejos
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return game_state

@app.post("/pause")
def pause_game():
    game_state["status"] = "paused"
    return {"status": "paused"}

@app.post("/predecir")
def predecir(data: PredictRequest):
    # 1. ACTUALIZAR ESTADO
    game_state["streak"] = data.racha 
    game_state["errors"] = data.errores
    
    # 2. PREPARAR DATOS ML
    largo_patron = LEVEL_CONFIG[data.nivel]["length"]
    accuracy = data.aciertos / largo_patron if largo_patron > 0 else 0
    tiempo_por_acierto = data.tiempo / data.aciertos if data.aciertos > 0 else data.tiempo

    input_ml = pd.DataFrame([{
        "Nivel": data.nivel,
        "Accuracy": round(accuracy, 3),
        "Tiempo_Promedio": round(tiempo_por_acierto, 3),
        "Racha": data.racha
    }])

    # 3. PREDICCIÓN
    accion = "MANTENER"
    if modelo:
        try:
            accion = modelo.predict(input_ml)[0]
        except Exception as e:
            print(f"Error ML: {e}")
            accion = "MANTENER"

    print("\n📊 Input ML (Formateado):")
    print(input_ml)
    print("🤖 Acción ML:", accion)

    # 4. APLICAR ACCIÓN (SOLO UNA VEZ - ERROR CORREGIDO)
    if accion == "SUBIR":
        game_state["level"] = min(5, game_state["level"] + 1)
    elif accion == "BAJAR":
        game_state["level"] = max(1, game_state["level"] - 1)
    
    # El nivel se actualiza AHORA en el game_state global.
    # Cuando inicie la nueva ronda en el thread, usará este nuevo nivel.

    # 5. INICIAR NUEVA RONDA
    threading.Thread(target=iniciar_nueva_ronda, daemon=True).start()

    return { 
        "accion": accion,
        "nuevo_nivel": game_state["level"] # Devolvemos el nivel calculado
    }

@app.post("/reset")
def reset_game():
    game_state.update({
        "level": 1,
        "pattern": [],
        "user_input": [],
        "errors": 0,
        "start_time": None,
        "streak": 0,
        "status": "idle"
    })
    return {"ok": True}

@app.get("/")
def root():
    return {"status": "Backend OK"}