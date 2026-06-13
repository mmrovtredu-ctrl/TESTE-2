/*
  images.js
  ---------
  Preenche a view "Gerar imagem":
  - Upload de imagem (clique ou arrastar)
  - Pré-visualização da imagem original
  - Botão para "gerar" versão com fundo branco (simulado)

  INTEGRAÇÃO REAL:
  No lugar de simulateImageGeneration(), envie a imagem para seu
  backend, que chama a API de remoção de fundo (ex: Remove.bg)
  e, se necessário, a API de geração de imagem (Hedra / fal.ai / Replicate)
  para compor o fundo branco. Retorne a URL da imagem processada.
*/

let uploadedImageDataUrl = null;

/**
 * Lê o arquivo selecionado e exibe a pré-visualização.
 * @param {File} file
 */
function handleImageUpload(file) {
  if (!file || !file.type.startsWith("image/")) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    uploadedImageDataUrl = e.target.result;

    const preview = document.getElementById("imagePreviewOriginal");
    preview.src = uploadedImageDataUrl;
    preview.classList.remove("is-hidden");

    // Habilita o botão de gerar imagem
    document.getElementById("generateImageBtn").disabled = false;

    // Limpa resultado anterior
    document.getElementById("imageResultBox").innerHTML =
      `<span class="image-result__placeholder">Clique em "Gerar imagem com fundo branco"</span>`;
  };
  reader.readAsDataURL(file);
}

/**
 * Simula o processamento da imagem (substitua por chamada real ao backend).
 * @returns {Promise<string>} resolve com a data URL da "imagem processada"
 */
function simulateImageGeneration() {
  return new Promise((resolve) => {
    // Aqui, como simulação, devolvemos a própria imagem enviada.
    // Na versão real, viria a imagem com fundo branco do backend.
    setTimeout(() => resolve(uploadedImageDataUrl), 1200);
  });
}

/**
 * Inicializa a view de geração de imagem.
 */
function initImages() {
  const dropzone = document.getElementById("imageDropzone");
  const input = document.getElementById("imageInput");
  const generateBtn = document.getElementById("generateImageBtn");
  const resultBox = document.getElementById("imageResultBox");

  // Clique na dropzone abre o seletor de arquivo (via <label> + input hidden)
  input.addEventListener("change", (e) => {
    handleImageUpload(e.target.files[0]);
  });

  // Suporte a arrastar e soltar
  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.style.borderColor = "var(--color-accent)";
  });

  dropzone.addEventListener("dragleave", () => {
    dropzone.style.borderColor = "var(--color-border)";
  });

  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.style.borderColor = "var(--color-border)";
    handleImageUpload(e.dataTransfer.files[0]);
  });

  // Botão de gerar imagem
  generateBtn.addEventListener("click", async () => {
    if (!uploadedImageDataUrl) return;

    generateBtn.disabled = true;
    generateBtn.textContent = "Gerando…";
    resultBox.innerHTML = `
      <div class="loading-row">
        <span class="spinner"></span>
        <span>Removendo fundo e aplicando fundo branco…</span>
      </div>
    `;

    try {
      const processedUrl = await simulateImageGeneration();
      resultBox.innerHTML = `<img src="${processedUrl}" alt="Produto com fundo branco" />`;
    } catch (err) {
      resultBox.innerHTML = `<span class="image-result__placeholder">Erro ao gerar imagem. Tente novamente.</span>`;
      console.error(err);
    } finally {
      generateBtn.disabled = false;
      generateBtn.textContent = "Gerar imagem com fundo branco";
    }
  });
}
