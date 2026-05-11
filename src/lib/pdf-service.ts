import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

async function captureElement(element: HTMLElement): Promise<{ dataUrl: string; width: number; height: number; }> {
  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.left = '-9999px';
  wrapper.style.top = '0';
  wrapper.style.width = 'auto';
  wrapper.style.height = 'auto';
  wrapper.style.pointerEvents = 'none';
  wrapper.style.overflow = 'visible';
  wrapper.style.zIndex = '999999';
  wrapper.style.background = '#ffffff';

  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.width = `${element.offsetWidth}px`;
  clone.style.height = `${element.offsetHeight}px`;
  clone.style.transform = 'none';
  clone.style.opacity = '1';
  clone.style.visibility = 'visible';
  clone.style.position = 'relative';

  const hiddenElements = Array.from(clone.querySelectorAll<HTMLElement>('.no-print, button'));
  hiddenElements.forEach((el) => el.style.setProperty('display', 'none', 'important'));

  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  try {
    const canvas = await html2canvas(clone, {
      backgroundColor: '#ffffff',
      scale: Math.max(window.devicePixelRatio || 1, 1.5),
      useCORS: true,
      allowTaint: false,
      logging: false,
      width: clone.scrollWidth || clone.offsetWidth,
      height: clone.scrollHeight || clone.offsetHeight,
      windowWidth: clone.scrollWidth || clone.offsetWidth,
      windowHeight: clone.scrollHeight || clone.offsetHeight,
      scrollX: 0,
      scrollY: 0,
      ignoreElements: (node) => {
        return node instanceof HTMLElement && (node.classList.contains('no-print') || node.tagName === 'BUTTON');
      }
    });

    const dataUrl = canvas.toDataURL('image/png', 1.0);
    return { dataUrl, width: canvas.width, height: canvas.height };
  } finally {
    document.body.removeChild(wrapper);
  }
}

/**
 * Downloads a single element as a PDF
 */
export async function downloadElementAsPdf(elementId: string, fileName: string) {
  const element = document.getElementById(elementId);
  if (!element) return;

  try {
    const { dataUrl, width, height } = await captureElement(element);
    
    const pdf = new jsPDF({
      orientation: width >= height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [width, height]
    });

    pdf.addImage(dataUrl, 'PNG', 0, 0, width, height);
    pdf.save(`${fileName}.pdf`);
  } catch (error) {
    console.error('Error generating PDF:', error);
  }
}

/**
 * Downloads multiple elements (all cards) into a single PDF
 */
export async function downloadAllCardsAsPdf(containerId: string, cardsSelector: string, fileName: string) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const cards = container.querySelectorAll(cardsSelector);
  if (cards.length === 0) return;

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 10;
  
  const cardWidth = (pageWidth - (margin * 3)) / 2;
  const cardHeight = cardWidth / 1.58;
  
  let currentX = margin;
  let currentY = margin;
  let cardCount = 0;

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i] as HTMLElement;
    
    try {
      const { dataUrl } = await captureElement(card);

      if (cardCount > 0 && cardCount % 8 === 0) {
        pdf.addPage();
        currentY = margin;
        currentX = margin;
      }

      pdf.addImage(dataUrl, 'PNG', currentX, currentY, cardWidth, cardHeight);
      
      if (cardCount % 2 === 0) {
        currentX = margin * 2 + cardWidth;
      } else {
        currentX = margin;
        currentY += cardHeight + margin;
      }
      
      cardCount++;
    } catch (error) {
      console.error(`Error processing card ${i}:`, error);
    }
  }

  pdf.save(`${fileName}.pdf`);
}
