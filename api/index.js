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
    const { html_final } = req.body;

    if (!html_final) {
      return res.status(400).json({
        error: 'Dados inválidos',
        message: 'O campo "html_final" é obrigatório'
      });
    }

    // Detecção do ambiente (Local vs Vercel/Produção)
    const isProduction = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
    
    let chromiumExecutable;
    let launchOptions;

    if (isProduction) {
      // Ambiente Serverless (Vercel/AWS Lambda)
      const chromium = require('chrome-aws-lambda');
      
      launchOptions = {
        args: chromium.args,
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

    // Inicialização do Browser
    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();

    // Carregamento do conteúdo HTML
    await page.setContent(html_final, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // CRÍTICO: Aguardar renderização completa do MathJax
    // Estratégia robusta: aguarda scripts carregarem e MathJax processar
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
      console.log('MathJax não encontrado ou timeout');
    });

    // Aguardar tempo adicional para garantir renderização final
    await page.waitForTimeout(2000);

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
