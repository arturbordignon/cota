import { mountCraneScene } from "./crane-scene.js";

const ALTURA_HEADER = 64;
const FAIXAS = [
  [0.1, 0.38],
  [0.38, 0.64],
  [0.64, 0.9],
];

function passoDe(progresso) {
  if (progresso < 0.1) {
    return 0;
  }
  if (progresso < 0.38) {
    return 1;
  }
  if (progresso < 0.64) {
    return 2;
  }
  if (progresso < 0.9) {
    return 3;
  }
  return 4;
}

function ligarLinks() {
  let base = "http://localhost:3001";
  if (window.COTA_APP_URL) {
    base = String(window.COTA_APP_URL).replace(/\/$/, "");
  }
  document.querySelectorAll("[data-app]").forEach((elemento) => {
    const caminho = elemento.getAttribute("data-app");
    elemento.setAttribute("href", base + caminho);
  });
}

function progressoAgora(secao, stick) {
  const caixa = secao.getBoundingClientRect();
  const total = caixa.height - stick.offsetHeight;
  if (total < 40) {
    return 0;
  }
  const valor = (ALTURA_HEADER - caixa.top) / total;
  if (valor < 0) {
    return 0;
  }
  if (valor > 1) {
    return 1;
  }
  return valor;
}

function mostrarPasso(blocos, passo) {
  blocos.forEach((bloco) => {
    const alvo = Number(bloco.getAttribute("data-passo"));
    if (alvo === passo) {
      bloco.classList.add("visivel");
      return;
    }
    bloco.classList.remove("visivel");
  });
}

function pintarTrilho(trilhos, progresso) {
  trilhos.forEach((trilho, indice) => {
    const faixa = FAIXAS[indice];
    let preenchido = 0;
    if (faixa) {
      preenchido = (progresso - faixa[0]) / (faixa[1] - faixa[0]);
    }
    if (preenchido < 0) {
      preenchido = 0;
    }
    if (preenchido > 1) {
      preenchido = 1;
    }
    const barra = trilho.querySelector("span");
    if (barra) {
      barra.style.width = Math.round(preenchido * 100) + "%";
    }
  });
}

function iniciarCena() {
  const secao = document.getElementById("como-funciona");
  const stick = document.getElementById("cena-stick");
  const canvas = document.getElementById("cena");
  if (!secao || !stick || !canvas) {
    return;
  }

  const blocos = document.querySelectorAll("[data-passo]");
  const trilhos = document.querySelectorAll("[data-trilho]");
  let ultimoPasso = -1;
  let ultimoTrilho = -1;

  const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let qualidade = "low";
  const memoria = navigator.deviceMemory;
  if (window.innerWidth >= 900) {
    if (!memoria || memoria >= 4) {
      qualidade = "high";
    }
  }

  mountCraneScene(canvas, {
    reducedMotion: reduzido,
    quality: qualidade,
    paint: "#E7E8E4",
    initialProgress: progressoAgora(secao, stick),
    getProgress: function () {
      return progressoAgora(secao, stick);
    },
    onProgress: function (progresso) {
      const passo = passoDe(progresso);
      if (passo !== ultimoPasso) {
        ultimoPasso = passo;
        mostrarPasso(blocos, passo);
      }
      const marco = Math.round(progresso * 40) / 40;
      if (marco === ultimoTrilho) {
        return;
      }
      ultimoTrilho = marco;
      pintarTrilho(trilhos, marco);
    },
  });
}

ligarLinks();
iniciarCena();
