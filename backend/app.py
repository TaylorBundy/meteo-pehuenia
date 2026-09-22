import os
import json
import base64
import re
import unicodedata

import requests
from flask import Flask, request, jsonify
from flask_cors import CORS


app = Flask(__name__)

# ============================================================
# CONFIGURACIÓN
# ============================================================

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
GITHUB_REPO = os.getenv("GITHUB_REPO", "TaylorBundy/meteo-pehuenia")
GITHUB_FILE_PATH = os.getenv("GITHUB_FILE_PATH", "data/ubicaciones.json")
GITHUB_BRANCH = os.getenv("GITHUB_BRANCH", "main")

ALLOWED_ORIGIN = os.getenv(
    "ALLOWED_ORIGIN",
    "*"
)

GITHUB_API = "https://api.github.com"

CORS(
    app,
    resources={
        r"/api/*": {
            "origins": ALLOWED_ORIGIN
        }
    }
)


# ============================================================
# FUNCIONES AUXILIARES
# ============================================================

def github_headers():
    return {
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
    }


def generar_id(nombre, ubicaciones):
    """
    Genera un ID a partir del nombre.
    Ejemplo:
    Villa Pehuenia -> villa-pehuenia

    Si ya existe:
    villa-pehuenia-2
    villa-pehuenia-3
    """

    texto = unicodedata.normalize("NFD", nombre)
    texto = texto.encode("ascii", "ignore").decode("ascii")

    texto = texto.lower()
    texto = re.sub(r"[^a-z0-9]+", "-", texto)
    texto = texto.strip("-")

    if not texto:
        texto = "ubicacion"

    ids_existentes = {
        str(item.get("id", ""))
        for item in ubicaciones
    }

    nuevo_id = texto
    contador = 2

    while nuevo_id in ids_existentes:
        nuevo_id = f"{texto}-{contador}"
        contador += 1

    return nuevo_id


def obtener_archivo_github():
    """
    Obtiene el contenido actual de ubicaciones.json
    junto con su SHA.
    """

    url = (
        f"{GITHUB_API}/repos/"
        f"{GITHUB_REPO}/contents/"
        f"{GITHUB_FILE_PATH}"
    )

    response = requests.get(
        url,
        headers=github_headers(),
        params={"ref": GITHUB_BRANCH},
        timeout=20
    )

    if not response.ok:
        raise Exception(
            f"GitHub devolvió {response.status_code}: "
            f"{response.text}"
        )

    data = response.json()

    contenido = base64.b64decode(
        data["content"]
    ).decode("utf-8")

    ubicaciones = json.loads(contenido)

    return ubicaciones, data["sha"]


def guardar_archivo_github(ubicaciones, sha, mensaje):
    """
    Actualiza ubicaciones.json mediante la API de GitHub.
    """

    url = (
        f"{GITHUB_API}/repos/"
        f"{GITHUB_REPO}/contents/"
        f"{GITHUB_FILE_PATH}"
    )

    contenido = json.dumps(
        ubicaciones,
        ensure_ascii=False,
        indent=2
    ) + "\n"

    contenido_base64 = base64.b64encode(
        contenido.encode("utf-8")
    ).decode("utf-8")

    payload = {
        "message": mensaje,
        "content": contenido_base64,
        "sha": sha,
        "branch": GITHUB_BRANCH
    }

    response = requests.put(
        url,
        headers=github_headers(),
        json=payload,
        timeout=30
    )

    if not response.ok:
        raise Exception(
            f"Error actualizando GitHub "
            f"{response.status_code}: "
            f"{response.text}"
        )

    return response.json()


# ============================================================
# RUTAS
# ============================================================

@app.get("/")
def inicio():
    return jsonify({
        "ok": True,
        "servicio": "Meteo Pehuenia API"
    })


@app.get("/api/health")
def health():
    return jsonify({
        "ok": True,
        "github_repo": GITHUB_REPO,
        "github_file": GITHUB_FILE_PATH,
        "github_branch": GITHUB_BRANCH
    })


@app.get("/api/ubicaciones")
def listar_ubicaciones():

    if not GITHUB_TOKEN:
        return jsonify({
            "ok": False,
            "error": "No está configurado GITHUB_TOKEN en Render"
        }), 500

    try:

        ubicaciones, _ = obtener_archivo_github()

        return jsonify({
            "ok": True,
            "ubicaciones": ubicaciones
        })

    except Exception as error:

        return jsonify({
            "ok": False,
            "error": str(error)
        }), 500


@app.post("/api/ubicaciones")
def agregar_ubicacion():

    if not GITHUB_TOKEN:
        return jsonify({
            "ok": False,
            "error": "No está configurado GITHUB_TOKEN en Render"
        }), 500

    try:

        datos = request.get_json(silent=True)

        if not datos:
            return jsonify({
                "ok": False,
                "error": "No se recibieron datos"
            }), 400

        # ----------------------------------------------------
        # DATOS OBLIGATORIOS
        # ----------------------------------------------------

        nombre = str(
            datos.get("nombre", "")
        ).strip()

        provincia = str(
            datos.get("provincia", "")
        ).strip()

        pais = str(
            datos.get("pais", "Argentina")
        ).strip()

        if not nombre:
            return jsonify({
                "ok": False,
                "error": "El nombre es obligatorio"
            }), 400

        # ----------------------------------------------------
        # COORDENADAS
        # ----------------------------------------------------

        try:

            latitud = float(
                datos.get("latitud")
            )

            longitud = float(
                datos.get("longitud")
            )

        except (TypeError, ValueError):

            return jsonify({
                "ok": False,
                "error": "Las coordenadas no son válidas"
            }), 400

        if not (-90 <= latitud <= 90):
            return jsonify({
                "ok": False,
                "error": "La latitud debe estar entre -90 y 90"
            }), 400

        if not (-180 <= longitud <= 180):
            return jsonify({
                "ok": False,
                "error": "La longitud debe estar entre -180 y 180"
            }), 400

        # ----------------------------------------------------
        # OBTENER JSON ACTUAL
        # ----------------------------------------------------

        ubicaciones, sha = obtener_archivo_github()

        # ----------------------------------------------------
        # COMPROBAR DUPLICADOS
        # ----------------------------------------------------

        nombre_normalizado = nombre.casefold()

        for ubicacion in ubicaciones:

            nombre_existente = str(
                ubicacion.get("nombre", "")
            ).casefold()

            if nombre_existente == nombre_normalizado:

                return jsonify({
                    "ok": False,
                    "error": "Ya existe una ubicación con ese nombre",
                    "ubicacion": ubicacion
                }), 409

        # ----------------------------------------------------
        # CREAR ID
        # ----------------------------------------------------

        nuevo_id = generar_id(
            nombre,
            ubicaciones
        )

        # ----------------------------------------------------
        # CREAR UBICACIÓN
        # ----------------------------------------------------

        nueva_ubicacion = {
            "id": nuevo_id,
            "nombre": nombre,
            "provincia": provincia,
            "pais": pais,
            "latitud": latitud,
            "longitud": longitud
        }

        # ----------------------------------------------------
        # AGREGAR
        # ----------------------------------------------------

        ubicaciones.append(
            nueva_ubicacion
        )

        # Orden alfabético
        ubicaciones.sort(
            key=lambda item: str(
                item.get("nombre", "")
            ).casefold()
        )

        # ----------------------------------------------------
        # GUARDAR EN GITHUB
        # ----------------------------------------------------

        resultado = guardar_archivo_github(
            ubicaciones,
            sha,
            f"Agregar ubicación: {nombre}"
        )

        # ----------------------------------------------------
        # RESPUESTA
        # ----------------------------------------------------

        return jsonify({
            "ok": True,
            "mensaje": "Ubicación guardada correctamente",
            "ubicacion": nueva_ubicacion,
            "ubicaciones": ubicaciones,
            "commit": resultado.get("commit", {}).get("sha")
        })

    except Exception as error:

        print("ERROR:", error)

        return jsonify({
            "ok": False,
            "error": str(error)
        }), 500


# ============================================================
# ARRANQUE
# ============================================================

if __name__ == "__main__":

    port = int(
        os.getenv("PORT", 5000)
    )

    app.run(
        host="0.0.0.0",
        port=port,
        debug=False
    )