const puppeteer = require('puppeteer-core');

/**
 * Micro API Serverless para Geração de PDFs
 * Converte HTML em PDF com suporte a MathJax
 */
module.exports = async (req, res) => {
  // Rota GET - Página de informações
  if (req.method === 'GET') {
    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>PDF Generator API</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
          code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
          pre { background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; }
          .status { color: #28a745; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>📄 PDF Generator API</h1>
        <p class="status">✅ API Online e Funcionando</p>
        
        <h2>🚀 Como usar:</h2>
        <p>Envie uma requisição POST para <code>/api</code></p>
        
        <h3>Exemplo com cURL:</h3>
        <pre>curl -X POST https://n8n-html-render.vercel.app/api \\
  -H "Content-Type: application/json" \\
  -d '{"html_final":"&lt;!DOCTYPE html&gt;&lt;html&gt;&lt;body&gt;&lt;h1&gt;Teste&lt;/h1&gt;&lt;/body&gt;&lt;/html&gt;"}' \\
  --output documento.pdf</pre>
        
        <h3>Formato JSON:</h3>
        <pre>{
  "html_final": "&lt;!DOCTYPE html&gt;&lt;html&gt;...&lt;/html&gt;"
}</pre>
        
        <p><strong>Endpoint:</strong> <code>POST /api</code></p>
        <p><strong>Region:</strong> GRU1 (São Paulo)</p>
        <p><strong>Node:</strong> ${process.version}</p>
      </body>
      </html>
    `);
  }

  // Validação do método HTTP para POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Método não permitido',
      message: 'Use POST para gerar PDFs'
    });
  }

  let browser = null;

  try {
    // ===== PARSING DO BODY =====
    let bodyData = req.body;
    
    // Se o body vier como string, fazer parse manual
    if (typeof req.body === 'string') {
      try {
        bodyData = JSON.parse(req.body);
      } catch (parseError) {
        console.error('Erro ao fazer parse do body:', parseError);
        return res.status(400).json({
          error: 'JSON inválido',
          message: 'O corpo da requisição deve ser um JSON válido'
        });
      }
    }

    // Extração e validação dos dados
    const { html_final } = bodyData;

    if (!html_final) {
      return res.status(400).json({
        error: 'Dados inválidos',
        message: 'O campo "html_final" é obrigatório',
        received: Object.keys(bodyData)
      });
    }

    // Detecção do ambiente (Local vs Vercel/Produção)
    const isProduction = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
    
    let launchOptions;

    if (isProduction) {
      // Ambiente Serverless (Vercel/AWS Lambda)
      const chromium = require('@sparticuz/chromium');
      
      launchOptions = {
        args: [
          ...chromium.args,
          '--disable-software-rasterizer',
          '--single-process',
          '--no-zygote',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage'
        ],
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
        ignoreHTTPSErrors: true
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

    console.log('🚀 Iniciando browser...');
    // Inicialização do Browser
    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();

    console.log('📄 Carregando HTML...');
    // Carregamento do conteúdo HTML
    await page.setContent(html_final, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    console.log('🔢 Processando MathJax...');
    // CRÍTICO: Aguardar renderização completa do MathJax
    await page.evaluate(() => {
      return new Promise((resolve) => {
        // Se MathJax existe, aguarda processamento
        if (typeof MathJax !== 'undefined' && MathJax.typesetPromise) {
          MathJax.typesetPromise().then(resolve).catch(resolve);
        } else {
          // Se não tem MathJax, resolve imediatamente
          resolve();
        }
      });
    }).catch(() => {
      console.log('⚠️ MathJax não encontrado ou timeout');
    });

    // ===== FIX: Substituir waitForTimeout por setTimeout =====
    console.log('⏳ Aguardando renderização final...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('📋 Gerando PDF...');
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
      displayHeaderFooter: false,
      timeout: 60000
    });

    console.log('✅ PDF gerado com sucesso!');

    // Retorno do PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="documento.pdf"');
    res.setHeader('Content-Length', pdfBuffer.length);
    
    return res.status(200).send(pdfBuffer);

  } catch (error) {
    console.error('❌ Erro ao gerar PDF:', error);
    console.error('Stack completo:', error.stack);

    // Tratamento de erros específicos
    let statusCode = 500;
    let errorMessage = 'Erro interno ao gerar PDF';

    if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
      statusCode = 504;
      errorMessage = 'Timeout ao renderizar o conteúdo';
    } else if (error.message.includes('Could not find') || error.message.includes('executablePath')) {
      statusCode = 500;
      errorMessage = 'Erro ao inicializar o navegador (Chromium não encontrado)';
    } else if (error.message.includes('Navigation')) {
      statusCode = 500;
      errorMessage = 'Erro ao carregar o HTML';
    }

    return res.status(statusCode).json({
      error: errorMessage,
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });

  } finally {
    // Garantir fechamento do browser
    if (browser) {
      try {
        await browser.close();
        console.log('🔒 Browser fechado');
      } catch (closeError) {
        console.error('⚠️ Erro ao fechar browser:', closeError);
      }
    }
  }
};