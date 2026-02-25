// ============================================
// PARSING USER-AGENT (leger, sans dependance)
// ============================================
export interface ParsedUA {
  navigateur: string;
  os: string;
  appareil: string;
}

export const parseUserAgent = (ua: string): ParsedUA => {
  if (!ua) return { navigateur: 'Inconnu', os: 'Inconnu', appareil: 'Inconnu' };

  // --- Navigateur ---
  let navigateur = 'Inconnu';
  if (/Edg(?:e|A|iOS)?\/(\d+)/i.test(ua)) {
    navigateur = `Edge ${RegExp.$1}`;
  } else if (/OPR\/(\d+)/i.test(ua) || /Opera\/(\d+)/i.test(ua)) {
    navigateur = `Opera ${RegExp.$1}`;
  } else if (/Brave/i.test(ua)) {
    navigateur = 'Brave';
  } else if (/Vivaldi\/(\d+)/i.test(ua)) {
    navigateur = `Vivaldi ${RegExp.$1}`;
  } else if (/SamsungBrowser\/(\d+)/i.test(ua)) {
    navigateur = `Samsung Browser ${RegExp.$1}`;
  } else if (/Chrome\/(\d+)/i.test(ua) && !/Chromium/i.test(ua)) {
    navigateur = `Chrome ${RegExp.$1}`;
  } else if (/Firefox\/(\d+)/i.test(ua)) {
    navigateur = `Firefox ${RegExp.$1}`;
  } else if (/Safari\/(\d+)/i.test(ua) && /Version\/(\d+)/i.test(ua)) {
    navigateur = `Safari ${RegExp.$1}`;
  } else if (/MSIE\s(\d+)/i.test(ua) || /Trident.*rv:(\d+)/i.test(ua)) {
    navigateur = `Internet Explorer ${RegExp.$1}`;
  } else if (/curl/i.test(ua)) {
    navigateur = 'curl (outil CLI)';
  } else if (/wget/i.test(ua)) {
    navigateur = 'wget (outil CLI)';
  } else if (/python/i.test(ua)) {
    navigateur = 'Python (script)';
  } else if (/postman/i.test(ua)) {
    navigateur = 'Postman (test API)';
  } else if (/httpie/i.test(ua)) {
    navigateur = 'HTTPie (outil CLI)';
  } else if (/insomnia/i.test(ua)) {
    navigateur = 'Insomnia (test API)';
  } else if (/bot|crawl|spider|scrape/i.test(ua)) {
    navigateur = 'Bot/Crawler';
  }

  // --- OS ---
  let os = 'Inconnu';
  if (/Windows NT 10\.0/i.test(ua)) {
    os = 'Windows 10/11';
  } else if (/Windows NT 6\.3/i.test(ua)) {
    os = 'Windows 8.1';
  } else if (/Windows NT 6\.2/i.test(ua)) {
    os = 'Windows 8';
  } else if (/Windows NT 6\.1/i.test(ua)) {
    os = 'Windows 7';
  } else if (/Windows/i.test(ua)) {
    os = 'Windows';
  } else if (/Mac OS X (\d+[._]\d+)/i.test(ua)) {
    os = `macOS ${RegExp.$1.replace(/_/g, '.')}`;
  } else if (/Android (\d+(\.\d+)?)/i.test(ua)) {
    os = `Android ${RegExp.$1}`;
  } else if (/iPhone OS (\d+[._]\d+)/i.test(ua) || /iPad.*OS (\d+[._]\d+)/i.test(ua)) {
    os = `iOS ${RegExp.$1.replace(/_/g, '.')}`;
  } else if (/Linux/i.test(ua)) {
    os = 'Linux';
  } else if (/CrOS/i.test(ua)) {
    os = 'Chrome OS';
  } else if (/FreeBSD/i.test(ua)) {
    os = 'FreeBSD';
  }

  // --- Appareil ---
  let appareil = 'Ordinateur';
  if (/Mobile|Android.*Mobile|iPhone|iPod/i.test(ua)) {
    appareil = 'Smartphone';
  } else if (/iPad|Android(?!.*Mobile)|Tablet/i.test(ua)) {
    appareil = 'Tablette';
  } else if (/Smart-?TV|TV|BRAVIA|LG Browser|NetCast|webOS|Tizen/i.test(ua)) {
    appareil = 'Smart TV';
  } else if (/bot|crawl|spider|scrape|curl|wget|python|postman|httpie|insomnia/i.test(ua)) {
    appareil = 'Outil/Bot';
  }

  return { navigateur, os, appareil };
};
