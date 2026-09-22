const DEFAULT_LOCATION = {
  name: "Villa Pehuenia",
  admin: "Neuquén",
  country: "Argentina",
  // latitude: -38.884,
  // longitude: -71.171,
  latitude: -38.8910309,
  longitude: -71.1969777,
};
const API_URL = "https://meteo-pehuenia.onrender.com";
const $ = (id) => document.getElementById(id);
const locationModal = document.getElementById("locationModal");
const closeLocationModal = document.getElementById("closeLocationModal");
const cancelLocationModal = document.getElementById("cancelLocationModal");
const deleteLocationModal = document.getElementById("deleteLocationModal");
const closeDeleteLocationModal = document.getElementById(
  "closeDeleteLocationModal",
);
const cancelDeleteLocation = document.getElementById("cancelDeleteLocation");
const confirmDeleteLocations = document.getElementById(
  "confirmDeleteLocations",
);
const deleteLocationsList = document.getElementById("deleteLocationsList");
const deleteLocationWarning = document.getElementById("deleteLocationWarning");
const locationForm = document.getElementById("locationForm");
const locationSelect = document.getElementById("locationSelect");
const locationList = document.getElementById("editLocationsList");

let selectedLocation = { ...DEFAULT_LOCATION };
let weatherData = null;
let chart = null;
let ubicaciones = [];

function abrirModalUbicacion() {
  locationModal.classList.remove("hidden");

  document.body.style.overflow = "hidden";

  document.getElementById("locationName").focus();
}

function cerrarModalUbicacion() {
  const elementos = ["locationName", "locationLatitude", "locationLongitude"];
  limpiarFormulario(locationModal, elementos);
  locationModal.classList.add("hidden");

  document.body.style.overflow = "";
}

closeLocationModal.addEventListener("click", cerrarModalUbicacion);

cancelLocationModal.addEventListener("click", cerrarModalUbicacion);

locationModal.addEventListener("click", (event) => {
  if (event.target === locationModal) {
    cerrarModalUbicacion();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !locationModal.classList.contains("hidden")) {
    cerrarModalUbicacion();
  }
});

// =========================================================
// MODAL ELIMINAR UBICACIONES
// =========================================================

// =========================================================
// ABRIR
// =========================================================

async function abrirModalEliminarUbicacion() {
  deleteLocationModal.classList.remove("hidden");

  document.body.style.overflow = "hidden";

  await cargarListaEliminarUbicaciones();
}

// =========================================================
// CERRAR
// =========================================================

function cerrarModalEliminarUbicacion() {
  deleteLocationModal.classList.add("hidden");

  document.body.style.overflow = "";

  limpiarSeleccionEliminar();
}

// =========================================================
// EVENTOS
// =========================================================

closeDeleteLocationModal.addEventListener(
  "click",
  cerrarModalEliminarUbicacion,
);

cancelDeleteLocation.addEventListener("click", cerrarModalEliminarUbicacion);

deleteLocationModal.addEventListener("click", (event) => {
  if (event.target === deleteLocationModal) {
    cerrarModalEliminarUbicacion();
  }
});

// =========================================================
// ESC
// =========================================================

document.addEventListener("keydown", (event) => {
  if (
    event.key === "Escape" &&
    !deleteLocationModal.classList.contains("hidden")
  ) {
    cerrarModalEliminarUbicacion();
  }
});

async function cargarListaEliminarUbicaciones() {
  deleteLocationsList.innerHTML = `
        <div class="loading-locations">
            Cargando ubicaciones...
        </div>
    `;

  confirmDeleteLocations.disabled = true;

  try {
    const respuesta = await fetch(`${API_URL}/api/ubicaciones`);

    if (!respuesta.ok) {
      throw new Error("No se pudieron obtener las ubicaciones.");
    }

    const resultado = await respuesta.json();

    if (!resultado.ok) {
      throw new Error(resultado.error || "Error obteniendo ubicaciones.");
    }

    // Actualizamos también el array global
    ubicaciones = resultado.ubicaciones;

    mostrarListaEliminar(ubicaciones);
  } catch (error) {
    console.error("Error cargando ubicaciones:", error);

    deleteLocationsList.innerHTML = `
            <div class="empty-locations">
                ❌ ${error.message}
            </div>
        `;
  }
}

function mostrarListaEliminar(lista) {
  deleteLocationsList.innerHTML = "";

  if (!Array.isArray(lista) || lista.length === 0) {
    deleteLocationsList.innerHTML = `
            <div class="empty-locations">
                No hay ubicaciones para eliminar.
            </div>
        `;

    return;
  }

  lista.forEach((ubicacion) => {
    const item = document.createElement("label");

    item.className = "delete-location-item";

    item.innerHTML = `

            <input
                type="checkbox"
                class="delete-location-checkbox"
                value="${escapeHtml(ubicacion.id)}"
            >

            <div class="delete-location-data">

                <span class="delete-location-id">
                    ${escapeHtml(ubicacion.id)}
                </span>

                <span class="delete-location-name">
                    ${escapeHtml(ubicacion.nombre)}
                </span>

                <span class="delete-location-coordinates">
                    ${ubicacion.latitud},
                    ${ubicacion.longitud}
                </span>

            </div>

        `;

    const checkbox = item.querySelector(".delete-location-checkbox");

    checkbox.addEventListener("change", () => {
      item.classList.toggle("selected", checkbox.checked);

      actualizarEstadoEliminar();
    });

    deleteLocationsList.appendChild(item);
  });
}

function escapeHtml(valor) {
  return String(valor)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function obtenerIdsSeleccionados() {
  return [
    ...deleteLocationsList.querySelectorAll(
      ".delete-location-checkbox:checked",
    ),
  ].map((checkbox) => checkbox.value);
}

function actualizarEstadoEliminar() {
  const ids = obtenerIdsSeleccionados();

  const haySeleccionados = ids.length > 0;

  confirmDeleteLocations.disabled = !haySeleccionados;

  deleteLocationWarning.classList.toggle("hidden", !haySeleccionados);

  if (haySeleccionados) {
    confirmDeleteLocations.textContent = `🗑️ Eliminar ${ids.length} ubicación${
      ids.length === 1 ? "" : "es"
    }`;
  } else {
    confirmDeleteLocations.textContent = "🗑️ Eliminar seleccionadas";
  }
}

function limpiarSeleccionEliminar() {
  deleteLocationsList
    .querySelectorAll(".delete-location-checkbox")
    .forEach((checkbox) => {
      checkbox.checked = false;
    });

  deleteLocationsList
    .querySelectorAll(".delete-location-item")
    .forEach((item) => {
      item.classList.remove("selected");
    });

  deleteLocationWarning.classList.add("hidden");

  confirmDeleteLocations.disabled = true;

  confirmDeleteLocations.textContent = "🗑️ Eliminar seleccionadas";
}

confirmDeleteLocations.addEventListener(
  "click",
  eliminarUbicacionesSeleccionadas,
);

async function eliminarUbicacionesSeleccionadas() {
  const ids = obtenerIdsSeleccionados();

  if (ids.length === 0) {
    return;
  }

  const cantidad = ids.length;

  const confirmacion = confirm(
    `¿Seguro que querés eliminar ${cantidad} ubicación${
      cantidad === 1 ? "" : "es"
    }?\n\n` +
      `Esta acción modificará el archivo ` +
      `data/ubicaciones.json en GitHub.`,
  );

  if (!confirmacion) {
    return;
  }

  const textoOriginal = confirmDeleteLocations.textContent;

  try {
    confirmDeleteLocations.disabled = true;

    confirmDeleteLocations.textContent = "⏳ Eliminando...";

    const respuesta = await fetch(`${API_URL}/api/ubicaciones`, {
      method: "DELETE",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        ids,
      }),
    });

    const resultado = await respuesta.json();

    if (!respuesta.ok || !resultado.ok) {
      throw new Error(
        resultado.error || "No se pudieron eliminar las ubicaciones.",
      );
    }

    // ==============================================
    // ACTUALIZAR ARRAY GLOBAL
    // ==============================================

    ubicaciones = resultado.ubicaciones;

    // ==============================================
    // ACTUALIZAR SELECT PRINCIPAL
    // ==============================================

    actualizarSelectUbicaciones();

    // ==============================================
    // CERRAR MODAL
    // ==============================================

    cerrarModalEliminarUbicacion();

    // ==============================================
    // MENSAJE
    // ==============================================

    mostrarMensaje(
      `✅ ${resultado.eliminadas.length} ubicación${
        resultado.eliminadas.length === 1 ? "" : "es"
      } eliminada${
        resultado.eliminadas.length === 1 ? "" : "s"
      } correctamente.`,
    );
  } catch (error) {
    console.error("Error eliminando ubicaciones:", error);

    mostrarMensaje(`❌ ${error.message}`, true);

    confirmDeleteLocations.disabled = false;

    confirmDeleteLocations.textContent = textoOriginal;
  }
}

function actualizarSelectUbicaciones() {
  const select = document.getElementById("locationSelect");

  if (!select) {
    return;
  }

  select.innerHTML = "";

  const opcionInicial = document.createElement("option");

  opcionInicial.value = "";

  opcionInicial.textContent = "Seleccionar ubicación...";

  select.appendChild(opcionInicial);

  ubicaciones.forEach((ubicacion) => {
    const option = document.createElement("option");

    option.value = ubicacion.id;

    option.textContent = ubicacion.nombre;

    select.appendChild(option);
  });
}

// async function cargarUbicaciones2() {
//   const select = document.getElementById("locationSelect");

//   if (!select) {
//     console.error("No se encontró #locationSelect");
//     return;
//   }

//   try {
//     const respuesta = await fetch("data/ubicaciones.json");

//     if (!respuesta.ok) {
//       throw new Error(
//         `No se pudo cargar ubicaciones.json (${respuesta.status})`,
//       );
//     }

//     ubicaciones = await respuesta.json();

//     select.innerHTML = "";

//     const opcionInicial = document.createElement("option");
//     opcionInicial.value = "";
//     opcionInicial.textContent = "Seleccionar ubicación...";
//     select.appendChild(opcionInicial);

//     ubicaciones.forEach((ubicacion) => {
//       const option = document.createElement("option");

//       option.value = ubicacion.id;
//       option.textContent = ubicacion.nombre;

//       select.appendChild(option);
//     });

//     // Intentar recuperar la última ubicación utilizada
//     const ubicacionGuardada = localStorage.getItem("meteo-ubicacion-id");

//     if (ubicacionGuardada) {
//       const existe = ubicaciones.some(
//         (ubicacion) => ubicacion.id === ubicacionGuardada,
//       );

//       if (existe) {
//         select.value = ubicacionGuardada;
//         seleccionarUbicacion(ubicacionGuardada);
//       }
//     }
//   } catch (error) {
//     console.error("Error cargando ubicaciones:", error);

//     select.innerHTML = "";

//     const option = document.createElement("option");
//     option.value = "";
//     option.textContent = "Error al cargar ubicaciones";

//     select.appendChild(option);
//   }
// }

async function cargarUbicaciones() {
  const select = document.getElementById("locationSelect");

  if (!select) return;

  try {
    select.innerHTML = "<option value=''>Cargando ubicaciones...</option>";

    let datos;

    // ==================================================
    // PRIMERO: RENDER
    // ==================================================

    try {
      const respuesta = await fetch(`${API_URL}/api/ubicaciones`);

      if (!respuesta.ok) {
        throw new Error("Backend no disponible");
      }

      const resultado = await respuesta.json();
      // console.log(resultado);

      if (!resultado.ok) {
        throw new Error(resultado.error);
      }

      datos = resultado.ubicaciones;
    } catch (error) {
      console.warn("Render no disponible, usando JSON local:", error);

      // ==============================================
      // RESPALDO: GITHUB PAGES
      // ==============================================

      const respuesta = await fetch("data/ubicaciones.json");

      if (!respuesta.ok) {
        throw new Error("No se pudo cargar ubicaciones.json");
      }

      datos = await respuesta.json();
    }

    ubicaciones = datos;

    // ==================================================
    // LLENAR SELECT
    // ==================================================

    select.innerHTML = "";

    const opcionInicial = document.createElement("option");

    opcionInicial.value = "";
    opcionInicial.textContent = "Seleccionar ubicación...";

    select.appendChild(opcionInicial);

    ubicaciones.forEach((ubicacion) => {
      const option = document.createElement("option");

      option.value = ubicacion.id;

      option.textContent = ubicacion.nombre;

      select.appendChild(option);
    });

    // ==================================================
    // RECUPERAR ÚLTIMA UBICACIÓN
    // ==================================================

    const guardada = localStorage.getItem("meteo-ubicacion-id");

    if (guardada) {
      const existe = ubicaciones.some((ubicacion) => ubicacion.id === guardada);

      if (existe) {
        select.value = guardada;

        seleccionarUbicacion(guardada);
      }
    }
  } catch (error) {
    console.error("Error cargando ubicaciones:", error);

    select.innerHTML = "<option value=''>Error al cargar ubicaciones</option>";
  }
}

locationForm.addEventListener("submit", guardarUbicacion);

async function guardarUbicacion(event) {
  event.preventDefault();

  const boton = locationForm.querySelector('button[type="submit"]');

  const textoOriginal = boton.textContent;

  try {
    boton.disabled = true;
    boton.textContent = "⏳ Guardando...";

    const nombre = document.getElementById("locationName").value.trim();

    const provincia = document.getElementById("locationProvince").value.trim();

    const pais = document.getElementById("locationCountry").value.trim();

    const latitud = Number(document.getElementById("locationLatitude").value);

    const longitud = Number(document.getElementById("locationLongitude").value);

    // --------------------------------------------------
    // VALIDACIONES
    // --------------------------------------------------

    if (!nombre) {
      throw new Error("Ingresá el nombre de la ubicación.");
    }

    if (!Number.isFinite(latitud) || !Number.isFinite(longitud)) {
      throw new Error("Las coordenadas no son válidas.");
    }

    // --------------------------------------------------
    // ENVIAR A RENDER
    // --------------------------------------------------

    const respuesta = await fetch(`${API_URL}/api/ubicaciones`, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        nombre,
        provincia,
        pais,
        latitud,
        longitud,
      }),
    });

    const resultado = await respuesta.json();
    // console.log(resultado);

    if (!respuesta.ok || !resultado.ok) {
      throw new Error(resultado.error || "No se pudo guardar la ubicación.");
    }

    // --------------------------------------------------
    // ACTUALIZAR ARRAY LOCAL
    // --------------------------------------------------

    ubicaciones = resultado.ubicaciones;

    // --------------------------------------------------
    // ACTUALIZAR SELECT
    // --------------------------------------------------

    const select = document.getElementById("locationSelect");

    if (select) {
      select.innerHTML = "";

      const opcionInicial = document.createElement("option");

      opcionInicial.value = "";
      opcionInicial.textContent = "Seleccionar ubicación...";

      select.appendChild(opcionInicial);

      ubicaciones.forEach((ubicacion) => {
        const option = document.createElement("option");

        option.value = ubicacion.id;

        option.textContent = ubicacion.nombre;

        select.appendChild(option);
      });

      // Seleccionar la recién creada

      select.value = resultado.ubicacion.id;
    }

    // --------------------------------------------------
    // GUARDAR SELECCIÓN
    // --------------------------------------------------

    localStorage.setItem("meteo-ubicacion-id", resultado.ubicacion.id);

    // --------------------------------------------------
    // CERRAR MODAL
    // --------------------------------------------------

    cerrarModalUbicacion();

    // --------------------------------------------------
    // MOSTRAR MENSAJE
    // --------------------------------------------------

    mostrarMensaje(`✅ ${resultado.ubicacion.nombre} agregada correctamente.`);
  } catch (error) {
    console.error("Error guardando ubicación:", error);

    mostrarMensaje(`❌ ${error.message}`, true);
  } finally {
    boton.disabled = false;
    boton.textContent = textoOriginal;
  }
}

function mostrarMensaje(texto, error = false) {
  const mensaje = document.createElement("div");

  mensaje.className = "toast-mensaje";

  if (error) {
    mensaje.classList.add("error");
  }

  mensaje.textContent = texto;

  document.body.appendChild(mensaje);

  setTimeout(() => {
    mensaje.classList.add("mostrar");
  }, 10);

  setTimeout(() => {
    mensaje.classList.remove("mostrar");

    setTimeout(() => {
      mensaje.remove();
    }, 300);
  }, 3500);
}

function seleccionarUbicacion(id) {
  const ubicacion = ubicaciones.find((item) => item.id === id);

  if (!ubicacion) {
    console.error("Ubicación no encontrada:", id);
    return;
  }

  selectedLocation = {
    name: ubicacion.nombre,
    admin: ubicacion.provincia,
    country: ubicacion.pais,
    latitude: ubicacion.latitud,
    longitude: ubicacion.longitud,
  };

  // Guardar selección
  localStorage.setItem("meteo-ubicacion-id", ubicacion.id);

  // Actualizar interfaz
  updateLocationHeader();

  setCoordinateInputs();

  // Obtener nuevo pronóstico
  loadWeather();
}

// if (locationSelect) {
//   locationSelect.addEventListener("change", function () {
//     if (!this.value) return;

//     seleccionarUbicacion(this.value);
//   });
// }

// =========================================================
// MODAL EDITAR UBICACIÓN
// =========================================================

const editLocationModal = document.getElementById("editLocationModal");

const closeEditLocationModal = document.getElementById(
  "closeEditLocationModal",
);

const cancelEditLocation = document.getElementById("cancelEditLocation");

const saveEditedLocation = document.getElementById("saveEditedLocation");

const editLocationsList = document.getElementById("editLocationsList");

const editLocationForm = document.getElementById("editLocationForm");

// =========================================================
// ABRIR MODAL
// =========================================================

async function abrirModalEditarUbicacion() {
  editLocationModal.classList.remove("hidden");

  document.body.style.overflow = "hidden";

  // Ocultar formulario hasta seleccionar
  editLocationForm.classList.add("hidden");

  saveEditedLocation.disabled = true;

  await cargarListaEditarUbicaciones();
}

// =========================================================
// CERRAR MODAL
// =========================================================

function cerrarModalEditarUbicacion() {
  editLocationModal.classList.add("hidden");

  document.body.style.overflow = "";

  limpiarEdicionUbicacion();
}

// =========================================================
// EVENTOS
// =========================================================

closeEditLocationModal.addEventListener("click", cerrarModalEditarUbicacion);

cancelEditLocation.addEventListener("click", cerrarModalEditarUbicacion);

editLocationModal.addEventListener("click", (event) => {
  if (event.target === editLocationModal) {
    cerrarModalEditarUbicacion();
  }
});

// ESC

document.addEventListener("keydown", (event) => {
  if (
    event.key === "Escape" &&
    !editLocationModal.classList.contains("hidden")
  ) {
    cerrarModalEditarUbicacion();
  }
});

async function cargarListaEditarUbicaciones() {
  editLocationsList.innerHTML = `
        <div class="loading-locations">
            Cargando ubicaciones...
        </div>
    `;

  try {
    const respuesta = await fetch(`${API_URL}/api/ubicaciones`);

    if (!respuesta.ok) {
      throw new Error("No se pudieron obtener las ubicaciones.");
    }

    const resultado = await respuesta.json();

    if (!resultado.ok) {
      throw new Error(resultado.error || "Error obteniendo ubicaciones.");
    }

    // Actualizar array global

    ubicaciones = resultado.ubicaciones;

    mostrarListaEditar(ubicaciones);
  } catch (error) {
    console.error("Error cargando ubicaciones:", error);

    editLocationsList.innerHTML = `
            <div class="empty-locations">
                ❌ ${escapeHtml(error.message)}
            </div>
        `;
  }
}

function mostrarListaEditar(lista) {
  editLocationsList.innerHTML = "";

  if (!Array.isArray(lista) || lista.length === 0) {
    editLocationsList.innerHTML = `
            <div class="empty-locations">
                No hay ubicaciones para editar.
            </div>
        `;

    return;
  }

  lista.forEach((ubicacion) => {
    const item = document.createElement("label");

    item.className = "edit-location-item";

    item.innerHTML = `

                <input
                    type="radio"
                    name="editLocation"
                    class="edit-location-radio"
                    value="${escapeHtml(ubicacion.id)}"
                >

                <div class="edit-location-data">

                    <span class="edit-location-id">
                        ${escapeHtml(ubicacion.id)}
                    </span>

                    <span class="edit-location-name">
                        ${escapeHtml(ubicacion.nombre)}
                    </span>

                    <span class="edit-location-coordinates">
                        ${ubicacion.latitud},
                        ${ubicacion.longitud}
                    </span>

                </div>
            `;

    const radio = item.querySelector(".edit-location-radio");

    radio.addEventListener("change", () => {
      // Quitar selección visual
      editLocationsList
        .querySelectorAll(".edit-location-item")
        .forEach((elemento) => {
          elemento.classList.remove("selected");
        });

      item.classList.add("selected");

      seleccionarUbicacionParaEditar(ubicacion);
      const altura = item.getBoundingClientRect().height;
      item.style.marginTop = "4px";

      console.log("Altura del seleccionado:", altura);
      locationList.style.maxHeight = `${altura + 4}px`;
    });

    editLocationsList.appendChild(item);
  });
}

function seleccionarUbicacionParaEditar(ubicacion) {
  // ID
  document.getElementById("editLocationId").textContent = ubicacion.id;

  // Nombre
  document.getElementById("editLocationName").value = ubicacion.nombre || "";

  // Latitud
  document.getElementById("editLocationLatitude").value = ubicacion.latitud;

  // Longitud
  document.getElementById("editLocationLongitude").value = ubicacion.longitud;

  // Mostrar formulario

  editLocationForm.classList.remove("hidden");

  // Habilitar guardar

  saveEditedLocation.disabled = false;
}

saveEditedLocation.addEventListener("click", guardarEdicionUbicacion);

async function guardarEdicionUbicacion() {
  const id = document.getElementById("editLocationId").textContent.trim();

  const nombre = document.getElementById("editLocationName").value.trim();

  const latitud = Number(document.getElementById("editLocationLatitude").value);

  const longitud = Number(
    document.getElementById("editLocationLongitude").value,
  );

  // =====================================================
  // VALIDACIONES
  // =====================================================

  if (!id) {
    mostrarMensaje("❌ No se seleccionó ninguna ubicación.", true);

    return;
  }

  if (!nombre) {
    mostrarMensaje("❌ El nombre no puede estar vacío.", true);

    return;
  }

  if (!Number.isFinite(latitud) || latitud < -90 || latitud > 90) {
    mostrarMensaje("❌ La latitud debe estar entre -90 y 90.", true);

    return;
  }

  if (!Number.isFinite(longitud) || longitud < -180 || longitud > 180) {
    mostrarMensaje("❌ La longitud debe estar entre -180 y 180.", true);

    return;
  }

  const textoOriginal = saveEditedLocation.textContent;

  try {
    saveEditedLocation.disabled = true;

    saveEditedLocation.textContent = "⏳ Guardando...";

    const respuesta = await fetch(`${API_URL}/api/ubicaciones`, {
      method: "PUT",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        id,
        nombre,
        latitud,
        longitud,
      }),
    });

    const resultado = await respuesta.json();

    if (!respuesta.ok || !resultado.ok) {
      throw new Error(resultado.error || "No se pudo modificar la ubicación.");
    }

    // =================================================
    // ACTUALIZAR ARRAY GLOBAL
    // =================================================

    ubicaciones = resultado.ubicaciones;

    // =================================================
    // ACTUALIZAR SELECT
    // =================================================

    actualizarSelectUbicaciones();

    // Mantener seleccionada la ubicación editada

    const select = document.getElementById("locationSelect");

    if (select) {
      select.value = resultado.ubicacion.id;

      localStorage.setItem("meteo-ubicacion-id", resultado.ubicacion.id);
    }

    // =================================================
    // CERRAR
    // =================================================

    cerrarModalEditarUbicacion();

    // =================================================
    // MENSAJE
    // =================================================

    mostrarMensaje(
      `✅ "${resultado.ubicacion.nombre}" fue actualizada correctamente.`,
    );
  } catch (error) {
    console.error("Error editando ubicación:", error);

    mostrarMensaje(`❌ ${error.message}`, true);

    saveEditedLocation.disabled = false;

    saveEditedLocation.textContent = textoOriginal;
  }
}

function limpiarEdicionUbicacion() {
  editLocationsList
    .querySelectorAll(".edit-location-radio")
    .forEach((radio) => {
      radio.checked = false;
    });

  editLocationsList.querySelectorAll(".edit-location-item").forEach((item) => {
    item.classList.remove("selected");
  });

  editLocationForm.classList.add("hidden");

  document.getElementById("editLocationId").textContent = "";

  document.getElementById("editLocationName").value = "";

  document.getElementById("editLocationLatitude").value = "";

  document.getElementById("editLocationLongitude").value = "";

  saveEditedLocation.disabled = true;

  saveEditedLocation.textContent = "💾 Guardar cambios";
}

document.addEventListener("DOMContentLoaded", () => {
  $("footerYear").textContent = new Date().getFullYear();

  const saved = localStorage.getItem("meteo-location");
  if (saved) {
    try {
      selectedLocation = JSON.parse(saved);
    } catch (_) {}
  }

  setCoordinateInputs();
  updateLocationHeader();
  cargarUbicaciones();
  loadWeather();

  $("btnRefresh").addEventListener("click", loadWeather);
  $("chartMode").addEventListener("change", renderChart);
  $("searchForm").addEventListener("submit", handleSearch);
  $("coordsForm").addEventListener("submit", handleCoords);

  if (locationSelect) {
    locationSelect.addEventListener("change", function () {
      if (!this.value) return;

      seleccionarUbicacion(this.value);
    });
  }

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".hero")) {
      $("searchResults").classList.add("hidden");
    }
  });
});

async function loadWeather() {
  setStatus("Consultando pronóstico...");
  $("btnRefresh").disabled = true;

  try {
    const params = new URLSearchParams({
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
      current: [
        "temperature_2m",
        "relative_humidity_2m",
        "apparent_temperature",
        "precipitation",
        "weather_code",
        "cloud_cover",
        "pressure_msl",
        "wind_speed_10m",
        "wind_direction_10m",
        "wind_gusts_10m",
      ].join(","),
      hourly: [
        "temperature_2m",
        "relative_humidity_2m",
        "dew_point_2m",
        "apparent_temperature",
        "precipitation_probability",
        "precipitation",
        "snowfall",
        "weather_code",
        "cloud_cover",
        "visibility",
        "pressure_msl",
        "wind_speed_10m",
        "wind_direction_10m",
        "wind_gusts_10m",
      ].join(","),
      daily: [
        "weather_code",
        "temperature_2m_max",
        "temperature_2m_min",
        "apparent_temperature_max",
        "apparent_temperature_min",
        "sunrise",
        "sunset",
        "uv_index_max",
        "precipitation_sum",
        "rain_sum",
        "snowfall_sum",
        "precipitation_probability_max",
        "wind_speed_10m_max",
        "wind_gusts_10m_max",
        "wind_direction_10m_dominant",
      ].join(","),
      timezone: "auto",
      forecast_days: "7",
      wind_speed_unit: "kmh",
      precipitation_unit: "mm",
    });

    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?${params}`,
    );
    if (!response.ok) throw new Error(`Error HTTP ${response.status}`);

    weatherData = await response.json();
    // console.log(weatherData);
    renderAll();
    hideStatus();
  } catch (error) {
    console.error(error);
    setStatus(
      "No se pudo obtener el pronóstico. Revisá tu conexión e intentá nuevamente.",
      true,
    );
  } finally {
    $("btnRefresh").disabled = false;
  }
}

function renderAll() {
  renderCurrent();
  renderActivity();
  renderHourlyCards();
  renderDaily();
  renderSun();
  renderChart();
}

function renderCurrent() {
  const c = weatherData.current;
  const h = weatherData.hourly;
  const idx = nearestHourlyIndex(c.time, h.time);

  $("currentTemp").textContent = round(c.temperature_2m);
  $("currentFeels").textContent = `${round(c.apparent_temperature)} °C`;
  $("currentDescription").textContent = weatherCodeInfo(c.weather_code).label;
  $("currentWeatherIcon").textContent = weatherCodeInfo(c.weather_code).icon;

  $("windSpeed").textContent = round(c.wind_speed_10m);
  $("windGust").textContent = round(c.wind_gusts_10m);
  $("windDirection").textContent =
    `${degreesToCompass(c.wind_direction_10m)} · ${round(c.wind_direction_10m)}°`;
  $("windLevel").textContent = windDescription(c.wind_gusts_10m);

  $("humidity").textContent = round(c.relative_humidity_2m);
  $("dewPoint").textContent = `P. rocío: ${round(h.dew_point_2m[idx])} °C`;

  $("precipitation").textContent = format1(c.precipitation);
  $("precipProbability").textContent =
    `Prob.: ${round(h.precipitation_probability[idx])}%`;
  $("snowfall").textContent = format1(h.snowfall[idx]);

  $("cloudCover").textContent = round(c.cloud_cover);
  $("visibility").textContent =
    `Visib.: ${formatVisibility(h.visibility[idx])}`;
  $("pressure").textContent = round(c.pressure_msl);

  $("updatedTime").textContent = formatTime(c.time);
  $("elevation").textContent = `${round(weatherData.elevation)} m`;
}

function renderActivity() {
  const c = weatherData.current;
  const h = weatherData.hourly;
  const idx = nearestHourlyIndex(c.time, h.time);

  const gust = Number(c.wind_gusts_10m || 0);
  const precip = Number(c.precipitation || 0);
  const visibility = Number(h.visibility[idx] || 0);
  const temp = Number(c.temperature_2m || 0);
  const snow = Number(h.snowfall[idx] || 0);

  let severity = 0;
  const reasons = [];

  if (gust >= 70) {
    severity += 3;
    reasons.push(`ráfagas muy fuertes (${round(gust)} km/h)`);
  } else if (gust >= 50) {
    severity += 2;
    reasons.push(`ráfagas fuertes (${round(gust)} km/h)`);
  } else if (gust >= 35) {
    severity += 1;
    reasons.push(`viento con ráfagas moderadas (${round(gust)} km/h)`);
  }

  if (precip >= 5) {
    severity += 2;
    reasons.push("precipitación intensa");
  } else if (precip >= 1) {
    severity += 1;
    reasons.push("precipitación presente");
  }

  if (snow >= 1) {
    severity += 2;
    reasons.push("nevada");
  } else if (snow > 0) {
    severity += 1;
    reasons.push("posible nieve");
  }

  if (visibility > 0 && visibility < 2000) {
    severity += 2;
    reasons.push("visibilidad reducida");
  } else if (visibility > 0 && visibility < 5000) {
    severity += 1;
    reasons.push("visibilidad limitada");
  }

  if (temp <= -5) {
    severity += 1;
    reasons.push("temperatura muy baja");
  }

  const badge = $("activityBadge");
  badge.className = "activity-badge";

  if (severity >= 4) {
    badge.textContent = "Precaución alta";
    badge.classList.add("bad");
    $("activityText").textContent =
      `Hay factores meteorológicos que requieren especial atención: ${reasons.join(", ")}. Verificá alertas oficiales y estado de caminos antes de salir.`;
  } else if (severity >= 2) {
    badge.textContent = "Con precaución";
    badge.classList.add("caution");
    $("activityText").textContent =
      `Las condiciones presentan algunos factores a considerar: ${reasons.join(", ")}. Conviene revisar la evolución horaria antes de una salida.`;
  } else {
    badge.textContent = "Sin señales severas";
    badge.classList.add("good");
    $("activityText").textContent = reasons.length
      ? `No se detectan condiciones severas en este momento, aunque se observa ${reasons.join(", ")}.`
      : "No se detectan, en los datos actuales, viento, precipitación o visibilidad en niveles especialmente adversos.";
  }
}

function renderHourlyCards() {
  const h = weatherData.hourly;
  const nowIdx = nearestHourlyIndex(weatherData.current.time, h.time);
  const container = $("hourlyCards");
  container.innerHTML = "";

  for (let i = nowIdx; i < Math.min(nowIdx + 16, h.time.length); i++) {
    const info = weatherCodeInfo(h.weather_code[i]);
    const card = document.createElement("article");
    card.className = "hour-card";
    card.innerHTML = `
      <div class="time">${i === nowIdx ? "Ahora" : formatTime(h.time[i])}</div>
      <div class="icon">${info.icon}</div>
      <div class="temp">${round(h.temperature_2m[i])}°</div>
      <div class="mini">
        💨 ${round(h.wind_speed_10m[i])} km/h<br>
        🌬️ ${round(h.wind_gusts_10m[i])} km/h<br>
        🌧️ ${round(h.precipitation_probability[i])}%
      </div>
    `;
    container.appendChild(card);
  }
}

function renderDaily() {
  const d = weatherData.daily;
  const container = $("dailyForecast");
  container.innerHTML = "";

  d.time.forEach((time, i) => {
    const date = new Date(`${time}T12:00:00`);
    const info = weatherCodeInfo(d.weather_code[i]);

    const card = document.createElement("article");
    card.className = "day-card";
    card.innerHTML = `
      <div class="day">${i === 0 ? "Hoy" : capitalize(date.toLocaleDateString("es-AR", { weekday: "short" }))}</div>
      <div class="date">${date.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })}</div>
      <div class="icon" title="${info.label}">${info.icon}</div>
      <div class="range">${round(d.temperature_2m_max[i])}° <span>/ ${round(d.temperature_2m_min[i])}°</span></div>
      <div class="rain">
        🌧️ ${round(d.precipitation_probability_max[i])}% · ${format1(d.precipitation_sum[i])} mm<br>
        🌬️ ráf. ${round(d.wind_gusts_10m_max[i])} km/h
      </div>
    `;
    container.appendChild(card);
  });
}

function renderSun() {
  const d = weatherData.daily;
  $("sunrise").textContent = formatTime(d.sunrise[0]);
  $("sunset").textContent = formatTime(d.sunset[0]);
  $("uvIndex").textContent = format1(d.uv_index_max[0]);
}

function renderChart() {
  if (!weatherData || typeof Chart === "undefined") return;

  const h = weatherData.hourly;
  const idx = nearestHourlyIndex(weatherData.current.time, h.time);
  const end = Math.min(idx + 48, h.time.length);
  const labels = h.time.slice(idx, end).map((x) => {
    const d = new Date(x);
    return d.toLocaleString("es-AR", { weekday: "short", hour: "2-digit" });
  });

  const mode = $("chartMode").value;
  let datasets = [];

  if (mode === "wind") {
    datasets = [
      {
        label: "Viento (km/h)",
        data: h.wind_speed_10m.slice(idx, end),
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 0,
      },
      {
        label: "Ráfagas (km/h)",
        data: h.wind_gusts_10m.slice(idx, end),
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 0,
      },
    ];
  } else if (mode === "precip") {
    datasets = [
      {
        type: "bar",
        label: "Precipitación (mm)",
        data: h.precipitation.slice(idx, end),
        borderWidth: 1,
      },
      {
        label: "Probabilidad (%)",
        data: h.precipitation_probability.slice(idx, end),
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 0,
        yAxisID: "y1",
      },
    ];
  } else {
    datasets = [
      {
        label: "Temperatura (°C)",
        data: h.temperature_2m.slice(idx, end),
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 0,
      },
      {
        label: "Sensación (°C)",
        data: h.apparent_temperature.slice(idx, end),
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 0,
      },
    ];
  }

  if (chart) chart.destroy();

  const scales = {
    x: {
      ticks: {
        color: "#91a4b8",
        maxRotation: 0,
        autoSkip: true,
        maxTicksLimit: 12,
      },
      grid: { color: "rgba(255,255,255,.04)" },
    },
    y: {
      ticks: { color: "#91a4b8" },
      grid: { color: "rgba(255,255,255,.06)" },
    },
  };

  if (mode === "precip") {
    scales.y1 = {
      position: "right",
      min: 0,
      max: 100,
      ticks: { color: "#91a4b8" },
      grid: { drawOnChartArea: false },
    };
  }

  chart = new Chart($("weatherChart"), {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { labels: { color: "#c8d6e2", usePointStyle: true } },
        tooltip: {
          backgroundColor: "#07111c",
          borderColor: "rgba(255,255,255,.12)",
          borderWidth: 1,
        },
      },
      scales,
    },
  });
}

async function handleSearch(event) {
  event.preventDefault();
  const query = $("searchInput").value.trim();
  if (query.length < 2) return;

  setStatus("Buscando localidad...");

  try {
    const params = new URLSearchParams({
      name: query,
      count: "8",
      language: "es",
      format: "json",
    });

    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?${params}`,
    );
    if (!response.ok) throw new Error("Error al buscar");

    const data = await response.json();
    renderSearchResults(data.results || []);
    hideStatus();
  } catch (error) {
    setStatus("No se pudo realizar la búsqueda.", true);
  }
}

function renderSearchResults(results) {
  const box = $("searchResults");
  box.innerHTML = "";

  if (!results.length) {
    box.innerHTML = `<div class="search-result"><strong>Sin resultados</strong><small>Probá con otro nombre.</small></div>`;
    box.classList.remove("hidden");
    return;
  }

  results.forEach((result) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "search-result";
    btn.innerHTML = `
      <strong>${escapeHtml(result.name)}</strong>
      <small>${escapeHtml([result.admin1, result.country].filter(Boolean).join(", "))}</small>
    `;
    btn.addEventListener("click", () => {
      selectedLocation = {
        name: result.name,
        admin: result.admin1 || "",
        country: result.country || "",
        latitude: result.latitude,
        longitude: result.longitude,
      };
      saveLocation();
      updateLocationHeader();
      setCoordinateInputs();
      box.classList.add("hidden");
      $("searchInput").value = "";
      loadWeather();
    });
    box.appendChild(btn);
  });

  box.classList.remove("hidden");
}

function handleCoords(event) {
  event.preventDefault();
  const lat = Number($("latInput").value);
  const lon = Number($("lonInput").value);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    lat < -90 ||
    lat > 90 ||
    lon < -180 ||
    lon > 180
  ) {
    setStatus("Ingresá coordenadas válidas.", true);
    return;
  }

  selectedLocation = {
    name: "Ubicación personalizada",
    admin: `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
    country: "",
    latitude: lat,
    longitude: lon,
  };

  saveLocation();
  updateLocationHeader();
  loadWeather();
}

function updateLocationHeader() {
  $("locationTitle").textContent = selectedLocation.name;
  $("locationSubtitle").textContent =
    [selectedLocation.admin, selectedLocation.country]
      .filter(Boolean)
      .join(", ") ||
    `${selectedLocation.latitude}, ${selectedLocation.longitude}`;
}

function setCoordinateInputs() {
  $("latInput").value = selectedLocation.latitude;
  $("lonInput").value = selectedLocation.longitude;
}

function saveLocation() {
  localStorage.setItem("meteo-location", JSON.stringify(selectedLocation));
}

function setStatus(message, isError = false) {
  const box = $("statusBox");
  box.textContent = message;
  box.className = `status${isError ? " error" : ""}`;
}

function hideStatus() {
  $("statusBox").classList.add("hidden");
}

function nearestHourlyIndex(currentTime, hourlyTimes) {
  const target = new Date(currentTime).getTime();
  let best = 0;
  let diff = Infinity;

  for (let i = 0; i < hourlyTimes.length; i++) {
    const d = Math.abs(new Date(hourlyTimes[i]).getTime() - target);
    if (d < diff) {
      diff = d;
      best = i;
    }
  }
  return best;
}

function weatherCodeInfo(code) {
  const table = {
    0: ["Despejado", "☀️"],
    1: ["Mayormente despejado", "🌤️"],
    2: ["Parcialmente nublado", "⛅"],
    3: ["Cubierto", "☁️"],
    45: ["Niebla", "🌫️"],
    48: ["Niebla con escarcha", "🌫️"],
    51: ["Llovizna leve", "🌦️"],
    53: ["Llovizna", "🌦️"],
    55: ["Llovizna intensa", "🌧️"],
    56: ["Llovizna helada leve", "🌧️"],
    57: ["Llovizna helada intensa", "🌧️"],
    61: ["Lluvia leve", "🌦️"],
    63: ["Lluvia", "🌧️"],
    65: ["Lluvia intensa", "🌧️"],
    66: ["Lluvia helada leve", "🌧️"],
    67: ["Lluvia helada intensa", "🌧️"],
    71: ["Nevada leve", "🌨️"],
    73: ["Nevada", "🌨️"],
    75: ["Nevada intensa", "❄️"],
    77: ["Granos de nieve", "❄️"],
    80: ["Chaparrones leves", "🌦️"],
    81: ["Chaparrones", "🌧️"],
    82: ["Chaparrones intensos", "⛈️"],
    85: ["Chaparrones de nieve leves", "🌨️"],
    86: ["Chaparrones de nieve intensos", "❄️"],
    95: ["Tormenta", "⛈️"],
    96: ["Tormenta con granizo", "⛈️"],
    99: ["Tormenta fuerte con granizo", "⛈️"],
  };
  const item = table[code] || ["Condiciones variables", "🌤️"];
  return { label: item[0], icon: item[1] };
}

function degreesToCompass(deg) {
  if (!Number.isFinite(Number(deg))) return "--";
  const dirs = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSO",
    "SO",
    "OSO",
    "O",
    "ONO",
    "NO",
    "NNO",
  ];
  return dirs[Math.round((Number(deg) % 360) / 22.5) % 16];
}

function windDescription(kmh) {
  const v = Number(kmh);
  if (v < 20) return "Ráfagas débiles";
  if (v < 35) return "Ráfagas moderadas";
  if (v < 50) return "Ráfagas fuertes";
  if (v < 70) return "Ráfagas muy fuertes";
  return "Ráfagas severas";
}

function formatVisibility(meters) {
  const m = Number(meters);
  if (!Number.isFinite(m)) return "--";
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
  return `${round(m)} m`;
}

function formatTime(iso) {
  if (!iso) return "--";
  return new Date(iso).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function round(value) {
  return Number.isFinite(Number(value)) ? Math.round(Number(value)) : "--";
}

function format1(value) {
  return Number.isFinite(Number(value)) ? Number(value).toFixed(1) : "--";
}

function capitalize(text) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ================================================================================
// Función para limpiar los campos de un formulario, restableciendo su estado inicial
// ================================================================================
function limpiarFormulario(contenedor, elementos) {
  elementos.forEach((elemento) => {
    document.getElementById(elemento).value = "";
  });
  console.log("Limpiando formulario:", contenedor);
  if (!contenedor) return;

  // const inputs = contenedor.querySelectorAll("input");

  // inputs.forEach((input) => {
  //   if (input.type === "checkbox" || input.type === "radio") {
  //     input.checked = false;
  //   } else {
  //     input.value = "";
  //   }
  // });
}
