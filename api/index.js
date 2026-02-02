// ===== IMPORTANTE: Adicionar no TOPO do arquivo =====
process.env.HOME = '/tmp';
process.env.TMPDIR = '/tmp';

const puppeteer = require('puppeteer-core');

/**
 * Micro API Serverless para Geração de PDFs
 * Converte HTML em PDF com suporte a MathJax
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
    // ===== PARSING DO BODY =====
    let bodyData = req.body;
    
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

    const { html_final } = bodyData;

    if (!html_final) {
      return res.status(400).json({
        error: 'Dados inválidos',
        message: 'O campo "html_final" é obrigatório',
        received: Object.keys(bodyData)
      });
    }

    const isProduction = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
    
    let launchOptions;

    if (isProduction) {
      const chromium = require('@sparticuz/chromium');
      
      launchOptions = {
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless
      };
    } else {
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
    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();

    console.log('📄 Carregando HTML...');
    await page.setContent(html_final, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    console.log('🔢 Processando MathJax...');
    await page.evaluate(() => {
      return new Promise((resolve) => {
        if (typeof MathJax !== 'undefined' && MathJax.typesetPromise) {
          MathJax.typesetPromise().then(resolve).catch(resolve);
        } else {
          resolve();
        }
      });
    }).catch(() => {
      console.log('⚠️ MathJax não encontrado ou timeout');
    });

    console.log('⏳ Aguardando renderização final...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('📋 Gerando PDF...');
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

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="documento.pdf"');
    res.setHeader('Content-Length', pdfBuffer.length);
    
    return res.status(200).send(pdfBuffer);

  } catch (error) {
    console.error('❌ Erro ao gerar PDF:', error);
    console.error('Stack completo:', error.stack);

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