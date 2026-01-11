# -*- coding: utf-8 -*-
"""
HCI - Backend Local FastAPI + RandomForest
"""

# =========================
# IMPORTS
# =========================
import pandas as pd
import random

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report

from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware


# =========================
# 1. CARGA DEL DATASET
# =========================
# Ajusta la ruta si es necesario
df = pd.read_csv("data\dataset_colores_leds_v2.csv")

# Variables independientes y dependiente
X = df[['Nivel', 'Aciertos', 'Errores', 'Tiempo_Reaccion', 'Racha']]
y = df['Accion_ML']

# Split de datos
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# =========================
# 2. ENTRENAMIENTO DEL MODELO
# =========================
modelo = RandomForestClassifier(
    n_estimators=100,
    random_state=42
)

modelo.fit(X_train, y_train)

# Evaluación básica
predicciones = modelo.predict(X_test)
print("\n📊 REPORTE DEL MODELO\n")
print(classification_report(y_test, predicciones))


# =========================
# 3. FASTAPI
# =========================
app = FastAPI(
    title="HCI API Local",
    description="API de predicción para juego de patrones LED",
    version="1.0.0"
)

# CORS (para frontend local o web)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================
# 4. MODELO DE DATOS (REQUEST)
# =========================
class DatosJuego(BaseModel):
    nivel: int
    aciertos: int
    errores: int
    tiempo: float
    racha: int


# =========================
# 5. ENDPOINT DE PREDICCIÓN
# =========================
@app.post("/predecir")
def predecir(datos: DatosJuego):
    try:
        input_data = [[
            datos.nivel,
            datos.aciertos,
            datos.errores,
            datos.tiempo,
            datos.racha
        ]]

        prediccion = modelo.predict(input_data)[0]

        print(
            f"✅ Nivel={datos.nivel} | "
            f"Aciertos={datos.aciertos} | "
            f"Errores={datos.errores} | "
            f"Tiempo={datos.tiempo} | "
            f"Racha={datos.racha} "
            f"=> 🤖 {prediccion}"
        )

        return {"accion": prediccion}

    except Exception as e:
        print(f"❌ Error: {e}")
        return {
            "accion": "MANTENER",
            "error": str(e)
        }


# =========================
# 6. ENDPOINT DE PRUEBA
# =========================
@app.get("/")
def root():
    return {"status": "API HCI corriendo correctamente 🚀"}
