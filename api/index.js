const puppeteer = require('puppeteer-core');

/**
 * Micro API Serverless para Geração de PDFs
 * Converte Markdown + LaTeX + Imagem de Capa em PDF
 */
module.exports = async (req, res) => {
  // Validação do método HTTP
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Método não permitido',
      message: 'Use POST para gerar PDFs'
    });
  }

  let browser = null;

  try {
    // Extração e validação dos dados do body
    const { texto_markdown, imagem_capa_base64 } = req.body;

    if (!texto_markdown) {
      return res.status(400).json({
        error: 'Dados inválidos',
        message: 'O campo "texto_markdown" é obrigatório'
      });
    }

    // Detecção do ambiente (Local vs Vercel/Produção)
    const isProduction = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
    
    let chromiumExecutable;
    let launchOptions;

    if (isProduction) {
      // Ambiente Serverless (Vercel/AWS Lambda)
      const chromium = require('@sparticuz/chromium');
      chromiumExecutable = await chromium.executablePath();
      
      launchOptions = {
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: chromiumExecutable,
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
      };
    } else {
      // Ambiente Local (Development)
      launchOptions = {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      };
    }

    // Inicialização do Browser
    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();

    // Construção do HTML com Template
    const html = criarTemplateHTML(texto_markdown, imagem_capa_base64);

    // Carregamento do conteúdo HTML
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // CRÍTICO: Aguardar renderização completa do MathJax
    await page.waitForSelector('#render-complete', {
      timeout: 25000
    });

    // Aguardar um tempo adicional para garantir renderização
    await page.waitForTimeout(1000);

    // Geração do PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      },
      displayHeaderFooter: false
    });

    // Retorno do PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="documento.pdf"');
    res.setHeader('Content-Length', pdfBuffer.length);
    
    return res.status(200).send(pdfBuffer);

  } catch (error) {
    console.error('Erro ao gerar PDF:', error);

    // Tratamento de erros específicos
    let statusCode = 500;
    let errorMessage = 'Erro interno ao gerar PDF';

    if (error.name === 'TimeoutError') {
      statusCode = 504;
      errorMessage = 'Timeout ao renderizar o conteúdo';
    } else if (error.message.includes('timeout')) {
      statusCode = 504;
      errorMessage = 'Tempo limite excedido ao processar o documento';
    }

    return res.status(statusCode).json({
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });

  } finally {
    // Garantir fechamento do browser
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Erro ao fechar browser:', closeError);
      }
    }
  }
};

/**
 * Cria o template HTML completo com scripts e estilos
 */
function criarTemplateHTML(textoMarkdown, imagemCapaBase64) {
  // Escape de caracteres especiais no markdown
  const markdownEscapado = textoMarkdown
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$');

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Documento PDF</title>
  
  <!-- Marked.js para conversão de Markdown -->
  <script src="https://cdn.jsdelivr.net/npm/marked@11.1.1/marked.min.js"></script>
  
  <!-- MathJax para renderização de fórmulas LaTeX -->
  <script>
    window.MathJax = {
      tex: {
        inlineMath: [['$', '$'], ['\\\\(', '\\\\)']],
        displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']],
        processEscapes: true,
        processEnvironments: true
      },
      svg: {
        fontCache: 'global'
      },
      startup: {
        ready: () => {
          MathJax.startup.defaultReady();
          MathJax.startup.promise.then(() => {
            // Sinalizar conclusão da renderização
            document.body.id = 'render-complete';
            console.log('MathJax renderizado com sucesso');
          });
        }
      }
    };
  </script>
  <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js" async></script>
  
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #fff;
    }

    .capa {
      page-break-after: always;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 40px;
    }

    .capa img {
      max-width: 100%;
      max-height: 90vh;
      object-fit: contain;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }

    .conteudo {
      padding: 20px 0;
    }

    .conteudo h1,
    .conteudo h2,
    .conteudo h3,
    .conteudo h4,
    .conteudo h5,
    .conteudo h6 {
      margin-top: 24px;
      margin-bottom: 16px;
      font-weight: 600;
      line-height: 1.25;
      color: #1a1a1a;
    }

    .conteudo h1 {
      font-size: 2em;
      border-bottom: 2px solid #eee;
      padding-bottom: 8px;
    }

    .conteudo h2 {
      font-size: 1.5em;
      border-bottom: 1px solid #eee;
      padding-bottom: 6px;
    }

    .conteudo p {
      margin-bottom: 16px;
      text-align: justify;
    }

    .conteudo ul,
    .conteudo ol {
      margin-bottom: 16px;
      padding-left: 30px;
    }

    .conteudo li {
      margin-bottom: 8px;
    }

    .conteudo pre {
      background: #f6f8fa;
      border-radius: 6px;
      padding: 16px;
      overflow-x: auto;
      margin-bottom: 16px;
      border: 1px solid #e1e4e8;
    }

    .conteudo code {
      background: #f6f8fa;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
    }

    .conteudo pre code {
      background: transparent;
      padding: 0;
      border-radius: 0;
    }

    .conteudo blockquote {
      border-left: 4px solid #ddd;
      padding-left: 16px;
      margin-bottom: 16px;
      color: #666;
      font-style: italic;
    }

    .conteudo table {
      border-collapse: collapse;
      width: 100%;
      margin-bottom: 16px;
    }

    .conteudo table th,
    .conteudo table td {
      border: 1px solid #ddd;
      padding: 8px 12px;
      text-align: left;
    }

    .conteudo table th {
      background-color: #f6f8fa;
      font-weight: 600;
    }

    .conteudo img {
      max-width: 100%;
      height: auto;
      margin: 16px 0;
    }

    /* Estilos para fórmulas matemáticas */
    mjx-container {
      margin: 8px 0;
    }

    mjx-container[display="true"] {
      display: block;
      text-align: center;
      margin: 16px 0;
    }

    /* Quebra de página */
    .page-break {
      page-break-after: always;
    }
  </style>
</head>
<body>
  ${imagemCapaBase64 ? `
  <div class="capa">
    <img src="${imagemCapaBase64}" alt="Capa do Documento" />
  </div>
  ` : ''}
  
  <div class="conteudo" id="conteudo-markdown"></div>

  <script>
    // Configuração do Marked
    marked.setOptions({
      breaks: true,
      gfm: true,
      headerIds: true,
      mangle: false
    });

    // Conversão do Markdown para HTML
    const markdownTexto = \`${markdownEscapado}\`;
    const htmlConvertido = marked.parse(markdownTexto);
    
    // Injeção do HTML convertido
    document.getElementById('conteudo-markdown').innerHTML = htmlConvertido;

    // Processar MathJax após injeção do conteúdo
    if (window.MathJax) {
      MathJax.typesetPromise().catch((err) => {
        console.error('Erro no MathJax:', err);
        // Mesmo com erro, marcar como completo para não travar
        document.body.id = 'render-complete';
      });
    } else {
      // Se MathJax não carregar, marcar como completo
      document.body.id = 'render-complete';
    }
  </script>
</body>
</html>
  `.trim();
}
