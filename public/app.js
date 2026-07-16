document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const wfPreview = document.getElementById('wfPreview');
  const watchScreen = document.getElementById('watchScreen');
  const widgetsContainer = document.getElementById('widgetsContainer');
  const wfBackground = document.getElementById('wfBackground');
  const guideV = document.getElementById('guideV');
  const guideH = document.getElementById('guideH');

  // Input Fields (Global Settings)
  const colorGlobalPrimary = document.getElementById('colorGlobalPrimary');
  const fontFamilySelect = document.getElementById('fontFamily');
  const appNameInput = document.getElementById('appName');
  const appIdInput = document.getElementById('appId');
  const presetButtons = document.querySelectorAll('.preset-btn');
  const backgroundStyleSelect = document.getElementById('backgroundStyle');
  const bgScaleInput = document.getElementById('bgScale');
  const valBgScale = document.getElementById('valBgScale');
  const bgXInput = document.getElementById('bgX');
  const valBgX = document.getElementById('valBgX');
  const bgYInput = document.getElementById('bgY');
  const valBgY = document.getElementById('valBgY');
  const bgSpacingInput = document.getElementById('bgSpacing');
  const valBgSpacing = document.getElementById('valBgSpacing');
  const bgOpacityInput = document.getElementById('bgOpacity');
  const valBgOpacity = document.getElementById('valBgOpacity');
  const bgRotationInput = document.getElementById('bgRotation');
  const valBgRotation = document.getElementById('valBgRotation');

  // Component Manager
  const addComponentSelect = document.getElementById('addComponentSelect');
  const btnAddComponent = document.getElementById('btnAddComponent');
  const layerList = document.getElementById('layerList');

  // Property Inspector
  const inspectorCard = document.getElementById('inspectorCard');
  const inspectorEmpty = document.getElementById('inspectorEmpty');
  const inspectorContent = document.getElementById('inspectorContent');
  const inspectorType = document.getElementById('inspectorType');
  const btnDeleteWidget = document.getElementById('btnDeleteWidget');
  const inspectX = document.getElementById('inspectX');
  const inspectY = document.getElementById('inspectY');
  const inspectSize = document.getElementById('inspectSize');
  const inspectValSize = document.getElementById('inspectValSize');
  const inspectSizeContainer = document.getElementById('inspectSizeContainer');
  const inspectDimensionsContainer = document.getElementById('inspectDimensionsContainer');
  const inspectWidth = document.getElementById('inspectWidth');
  const inspectHeight = document.getElementById('inspectHeight');
  const inspectColor = document.getElementById('inspectColor');
  const inspectCustomColorContainer = document.getElementById('inspectCustomColorContainer');
  const inspectCustomColor = document.getElementById('inspectCustomColor');
  
  const inspectIconStyleContainer = document.getElementById('inspectIconStyleContainer');
  const inspectIconStyle = document.getElementById('inspectIconStyle');
  const inspectIconSizeContainer = document.getElementById('inspectIconSizeContainer');
  const inspectIconSize = document.getElementById('inspectIconSize');
  const inspectValIconSize = document.getElementById('inspectValIconSize');
  const inspectProgressRingContainer = document.getElementById('inspectProgressRingContainer');
  const inspectProgressRing = document.getElementById('inspectProgressRing');
  const inspectShortcut = document.getElementById('inspectShortcut');

  // Action Buttons
  const btnSave = document.getElementById('btnSave');
  const btnBuild = document.getElementById('btnBuild');
  const buildLoader = document.getElementById('buildLoader');
  const qrOutputContainer = document.getElementById('qrOutputContainer');
  const qrImg = document.getElementById('qrImg');

  // State
  let currentThemeIndex = 0;
  let widgets = [];
  let selectedWidgetId = null;
  let isDragging = false;
  let activeDragWidget = null;
  const dragOffset = { x: 0, y: 0 };
  const scale = 0.687; // Scale factor matching CSS transform

  // Undo/Redo & AOD State
  const undoStack = [];
  const redoStack = [];
  let isAodMode = false;

  const PRESETS = [
    { primary: '#ff5a36', secondary: '#eaf4ff' },
    { primary: '#ff7b90', secondary: '#fff0f2' },
    { primary: '#7cd1a1', secondary: '#f0faf4' },
    { primary: '#8f9eff', secondary: '#f2f4ff' },
    { primary: '#ffd670', secondary: '#fffcf2' },
    { primary: '#ff9e7d', secondary: '#fff5f2' }
  ];

  // Load initial settings
  fetch('/api/config')
    .then(res => res.json())
    .then(config => {
      currentThemeIndex = config.themeIndex;
      colorGlobalPrimary.value = config.hourColor || config.lineColor;
      fontFamilySelect.value = config.fontFamily || 'Outfit';
      appNameInput.value = config.appName || 'Minimal Art V1.2';
      appIdInput.value = config.appId || 1120255;
      backgroundStyleSelect.value = config.backgroundStyle || 'none';
      bgScaleInput.value = config.backgroundScale || 100;
      bgXInput.value = config.backgroundX || 0;
      bgYInput.value = config.backgroundY || 0;
      bgSpacingInput.value = config.backgroundSpacing || 50;
      bgOpacityInput.value = config.backgroundOpacity !== undefined ? config.backgroundOpacity : 40;
      bgRotationInput.value = config.backgroundRotation || 0;
      
      // Load widgets list
      widgets = config.widgets || [];
      // Generate ID if missing
      widgets.forEach((w, idx) => {
        if (!w.id) w.id = `widget_${Date.now()}_${idx}`;
      });

      // Select preset button
      presetButtons.forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.preset) === currentThemeIndex);
      });

      updateGlobalStyles();
      renderAll();
      pushState();
    })
    .catch(err => console.error('Failed to load initial config:', err));

  // Global Config Listeners
  fontFamilySelect.addEventListener('change', () => {
    updateGlobalStyles();
    pushState();
  });

  backgroundStyleSelect.addEventListener('change', () => {
    updateGlobalStyles();
    pushState();
  });

  bgScaleInput.addEventListener('input', () => {
    updateGlobalStyles();
  });
  bgScaleInput.addEventListener('change', () => {
    pushState();
  });

  bgXInput.addEventListener('input', () => {
    updateGlobalStyles();
  });
  bgXInput.addEventListener('change', () => {
    pushState();
  });

  bgYInput.addEventListener('input', () => {
    updateGlobalStyles();
  });
  bgYInput.addEventListener('change', () => {
    pushState();
  });

  bgSpacingInput.addEventListener('input', () => {
    updateGlobalStyles();
  });
  bgSpacingInput.addEventListener('change', () => {
    pushState();
  });

  bgOpacityInput.addEventListener('input', () => {
    updateGlobalStyles();
  });
  bgOpacityInput.addEventListener('change', () => {
    pushState();
  });

  bgRotationInput.addEventListener('input', () => {
    updateGlobalStyles();
  });
  bgRotationInput.addEventListener('change', () => {
    pushState();
  });

  colorGlobalPrimary.addEventListener('input', () => {
    updateGlobalStyles();
    presetButtons.forEach(btn => btn.classList.remove('active'));
  });
  colorGlobalPrimary.addEventListener('change', () => {
    pushState();
  });

  presetButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      presetButtons.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      
      currentThemeIndex = parseInt(e.target.dataset.preset);
      const presetColors = PRESETS[currentThemeIndex];
      colorGlobalPrimary.value = presetColors.primary;
      
      updateGlobalStyles();
      pushState();
    });
  });

  function updateGlobalStyles() {
    const primary = colorGlobalPrimary.value;
    const secondary = PRESETS[currentThemeIndex].secondary;

    document.documentElement.style.setProperty('--primary-color', primary);
    document.documentElement.style.setProperty('--secondary-color', secondary);

    // Apply custom font classes
    wfPreview.className = 'watch-face';
    if (isAodMode) wfPreview.classList.add('aod-mode');
    const font = fontFamilySelect.value;
    if (font === 'Orbitron') wfPreview.classList.add('wf-font-orbitron');
    else if (font === 'Share Tech Mono') wfPreview.classList.add('wf-font-share');
    else if (font === 'JetBrains Mono') wfPreview.classList.add('wf-font-jetbrains');
    else wfPreview.classList.add('wf-font-outfit');

    // Update Background style in simulator (Centered & Positioned)
    const bg = backgroundStyleSelect.value;
    valBgScale.textContent = `${bgScaleInput.value}%`;
    valBgX.textContent = `${bgXInput.value}px`;
    valBgY.textContent = `${bgYInput.value}px`;
    valBgSpacing.textContent = `${bgSpacingInput.value}px`;
    valBgOpacity.textContent = `${bgOpacityInput.value}%`;
    valBgRotation.textContent = `${bgRotationInput.value}°`;

    if (bg === 'none' || isAodMode) {
      wfBackground.style.backgroundImage = 'none';
      wfBackground.style.backgroundColor = '#000000';
      wfBackground.style.transform = 'none';
    } else {
      const bgScale = parseInt(bgScaleInput.value);
      const bgX = parseInt(bgXInput.value);
      const bgY = parseInt(bgYInput.value);
      const bgSpacing = parseInt(bgSpacingInput.value);
      const bgOpacity = parseInt(bgOpacityInput.value);
      const bgRotation = parseInt(bgRotationInput.value);
      
      const w = Math.round(454 * (bgScale / 100));
      const h = Math.round(454 * (bgScale / 100));
      const x = Math.round(- (w - 454) / 2 + bgX);
      const y = Math.round(- (h - 454) / 2 + bgY);

      wfBackground.style.backgroundImage = `url('/api/background?style=${bg}&spacing=${bgSpacing}')`;
      wfBackground.style.backgroundColor = 'transparent';
      wfBackground.style.backgroundSize = `${w}px ${h}px`;
      wfBackground.style.backgroundPosition = `${x}px ${y}px`;
      wfBackground.style.backgroundRepeat = 'no-repeat';
      wfBackground.style.opacity = bgOpacity / 100;
      wfBackground.style.transform = `rotate(${bgRotation}deg)`;
    }
  }

  // Get Widget Size/Dimensions
  function getWidgetBounds(widget) {
    if (widget.type === 'HOUR' || widget.type === 'MINUTE') {
      return { w: 180, h: 130 };
    }
    if (widget.type === 'DIVIDER') {
      return { w: widget.w || 2, h: widget.h || 320 };
    }
    if (['BATTERY', 'STEP', 'HEART', 'CAL', 'DISTANCE'].includes(widget.type)) {
      if (widget.showProgress) {
        return { w: 120, h: 44 };
      }
      return { w: 100, h: 30 };
    }
    if (['WEEKDAY', 'DATE'].includes(widget.type)) {
      return { w: 100, h: 25 };
    }
    return { w: 50, h: 20 };
  }

  // Render widget markup inside simulator
  function getWidgetHTML(widget) {
    const mainColor = widget.color === 'primary' ? 'var(--primary-color)' : (widget.color === 'secondary' ? 'var(--secondary-color)' : widget.customColor || 'var(--text-primary)');
    const iconColor = widget.color === 'custom' ? (widget.customColor || 'var(--text-primary)') : 'var(--primary-color)';
    const textColor = widget.color === 'custom' ? (widget.customColor || 'var(--text-primary)') : 'var(--secondary-color)';
    const iconSize = widget.iconSize || 24;
    const iconStyle = widget.iconStyle || '1';

    if (widget.type === 'HOUR') {
      return `<div style="color: ${mainColor}; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: ${widget.size}px;">10</div>`;
    }
    if (widget.type === 'MINUTE') {
      return `<div style="color: ${mainColor}; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: ${widget.size}px;">09</div>`;
    }
    if (widget.type === 'DIVIDER') {
      return `<div style="width: 100%; height: 100%; background-color: ${mainColor};"></div>`;
    }

    // Generate dynamic icon vector HTML based on style and scale
    let iconHTML = '';
    if (widget.type === 'BATTERY') {
      if (iconStyle === '1') {
        iconHTML = `<div class="wf-vector-icon icon-battery" style="width: ${iconSize}px; height: ${iconSize * 0.6}px;"><div class="fill" style="background-color: ${iconColor};"></div><div class="tip" style="background-color: ${iconColor};"></div></div>`;
      } else if (iconStyle === '2') {
        iconHTML = `<div class="wf-vector-icon" style="width: ${iconSize * 0.6}px; height: ${iconSize}px; border: 2px solid ${iconColor}; border-radius: 2px; position: relative; display: flex; align-items: flex-end; box-sizing: border-box;"><div class="fill" style="width: 100%; height: 75%; background-color: ${iconColor};"></div><div class="tip" style="width: 50%; height: 2px; background-color: ${iconColor}; position: absolute; top: -4px; left: 25%;"></div></div>`;
      } else {
        iconHTML = `<div class="wf-vector-icon" style="width: ${iconSize}px; height: ${iconSize}px; display: flex; align-items: center; justify-content: center; color: ${iconColor}; font-size: ${iconSize * 0.8}px; line-height: 1;">⚡</div>`;
      }
    }
    else if (widget.type === 'STEP') {
      if (iconStyle === '1') {
        iconHTML = `<div class="wf-vector-icon icon-steps" style="width: ${iconSize}px; height: ${iconSize}px;"><div class="bar bar-1" style="background-color: ${iconColor};"></div><div class="bar bar-2" style="background-color: ${iconColor};"></div><div class="bar bar-3" style="background-color: ${iconColor};"></div></div>`;
      } else if (iconStyle === '2') {
        iconHTML = `<div class="wf-vector-icon" style="width: ${iconSize}px; height: ${iconSize}px; position: relative;"><div style="width: 35%; height: 60%; border-radius: 50% 50% 40% 40%; background-color: ${iconColor}; position: absolute; left: 10%; bottom: 10%; transform: rotate(-15deg);"></div><div style="width: 35%; height: 60%; border-radius: 50% 50% 40% 40%; background-color: ${iconColor}; position: absolute; right: 10%; top: 10%; transform: rotate(15deg);"></div></div>`;
      } else {
        iconHTML = `<div class="wf-vector-icon" style="width: ${iconSize}px; height: ${iconSize}px; display: flex; align-items: center; justify-content: center; font-size: ${iconSize * 0.9}px; line-height: 1;">🏃</div>`;
      }
    }
    else if (widget.type === 'HEART') {
      // Beautiful SVG heart icon (primary color)
      iconHTML = `<svg viewBox="0 0 24 24" width="${iconSize}" height="${iconSize}" style="display: block;" fill="${iconColor}"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
    }
    else if (widget.type === 'CAL') {
      if (iconStyle === '1') {
        iconHTML = `<div class="wf-vector-icon icon-calorie" style="width: ${iconSize}px; height: ${iconSize}px;"><div class="f-1" style="background-color: ${iconColor};"></div><div class="f-2" style="background-color: ${iconColor};"></div></div>`;
      } else if (iconStyle === '2') {
        iconHTML = `<div class="wf-vector-icon" style="width: ${iconSize}px; height: ${iconSize}px; display: flex; align-items: center; justify-content: center; font-size: ${iconSize * 0.9}px; line-height: 1;">🔥</div>`;
      } else {
        iconHTML = `<div class="wf-vector-icon" style="width: ${iconSize}px; height: ${iconSize}px; display: flex; align-items: center; justify-content: center; font-size: ${iconSize * 0.9}px; line-height: 1;">✨</div>`;
      }
    }
    else if (widget.type === 'DISTANCE') {
      if (iconStyle === '1') {
        iconHTML = `<div class="wf-vector-icon icon-distance" style="width: ${iconSize}px; height: ${iconSize}px;"><div class="circle" style="border-color: ${iconColor};"></div><div class="line" style="background-color: ${iconColor};"></div></div>`;
      } else if (iconStyle === '2') {
        iconHTML = `<div class="wf-vector-icon" style="width: ${iconSize}px; height: ${iconSize}px; display: flex; align-items: center; justify-content: center; font-size: ${iconSize * 0.9}px; line-height: 1;">📍</div>`;
      } else {
        iconHTML = `<div class="wf-vector-icon" style="width: ${iconSize}px; height: ${iconSize}px; display: flex; align-items: center; justify-content: center; font-size: ${iconSize * 0.9}px; line-height: 1;">🛣️</div>`;
      }
    }

    // Get Label Text (secondary color)
    let labelVal = '';
    if (widget.type === 'BATTERY') labelVal = '85%';
    else if (widget.type === 'STEP') labelVal = '8,420';
    else if (widget.type === 'HEART') labelVal = '72';
    else if (widget.type === 'CAL') labelVal = '340 kcal';
    else if (widget.type === 'DISTANCE') labelVal = '4.2 km';
    else if (widget.type === 'WEEKDAY') return `<span class="wf-widget-label" style="color: ${mainColor}; font-size: ${widget.size}px; width: 100%; text-align: center;">MON</span>`;
    else if (widget.type === 'DATE') return `<span class="wf-widget-label" style="color: ${mainColor}; font-size: ${widget.size}px; width: 100%; text-align: center;">JUL 16</span>`;

    const labelHTML = `<span class="wf-widget-label" style="color: ${textColor}; font-size: ${widget.size}px;">${labelVal}</span>`;

    // Wrap in Progress Ring if enabled
    if (widget.showProgress && ['BATTERY', 'STEP', 'HEART', 'CAL', 'DISTANCE'].includes(widget.type)) {
      const ringSize = 44;
      const strokeWidth = 3;
      const radius = (ringSize - strokeWidth) / 2;
      const circumference = 2 * Math.PI * radius;
      
      let progressPct = 0.75;
      if (widget.type === 'BATTERY') progressPct = 0.85;
      else if (widget.type === 'STEP') progressPct = 0.65;
      else if (widget.type === 'HEART') progressPct = 0.72;
      else if (widget.type === 'CAL') progressPct = 0.45;
      const strokeDashoffset = circumference * (1 - progressPct);

      return `
        <div style="display: flex; align-items: center; gap: 8px; position: relative;">
          <div style="width: ${ringSize}px; height: ${ringSize}px; position: relative; display: flex; align-items: center; justify-content: center;">
            <svg width="${ringSize}" height="${ringSize}" style="position: absolute; transform: rotate(-90deg); top: 0; left: 0;">
              <circle cx="${ringSize/2}" cy="${ringSize/2}" r="${radius}" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="${strokeWidth}"/>
              <circle cx="${ringSize/2}" cy="${ringSize/2}" r="${radius}" fill="none" stroke="${iconColor}" stroke-width="${strokeWidth}" 
                stroke-dasharray="${circumference}" stroke-dashoffset="${strokeDashoffset}" stroke-linecap="round"/>
            </svg>
            <div style="position: relative; z-index: 2; display: flex; align-items: center; justify-content: center;">
              ${iconHTML}
            </div>
          </div>
          ${labelHTML}
        </div>
      `;
    }

    return `${iconHTML} ${labelHTML}`;
  }

  // Draw all widgets in DOM
  function renderAll() {
    widgetsContainer.innerHTML = '';
    layerList.innerHTML = '';

    widgets.forEach(w => {
      // 1. Render in Watchface Simulator
      const bounds = getWidgetBounds(w);
      const widgetDiv = document.createElement('div');
      widgetDiv.className = 'wf-widget';
      if (w.id === selectedWidgetId) {
        widgetDiv.classList.add('selected');
      }
      widgetDiv.setAttribute('data-id', w.id);
      widgetDiv.setAttribute('data-type', w.type);
      widgetDiv.style.left = `${w.x}px`;
      widgetDiv.style.top = `${w.y}px`;
      widgetDiv.style.width = `${bounds.w}px`;
      widgetDiv.style.height = `${bounds.h}px`;

      if (['WEEKDAY', 'DATE'].includes(w.type)) {
        widgetDiv.classList.add('align-center');
      }

      widgetDiv.innerHTML = getWidgetHTML(w);

      // Hide metadata complications in AOD Mode (Keep only HOUR, MINUTE, DIVIDER)
      if (isAodMode && !['HOUR', 'MINUTE', 'DIVIDER'].includes(w.type)) {
        widgetDiv.style.display = 'none';
      } else {
        widgetDiv.style.display = 'flex';
      }

      widgetsContainer.appendChild(widgetDiv);

      // 2. Render in Sidebar Layer Manager
      const layerItem = document.createElement('div');
      layerItem.className = 'layer-item';
      if (w.id === selectedWidgetId) layerItem.classList.add('selected');
      layerItem.innerHTML = `
        <span class="layer-name">${w.type}</span>
        <span class="layer-coords">X: ${w.x} | Y: ${w.y}</span>
      `;
      layerItem.addEventListener('click', () => {
        selectWidget(w.id);
      });
      layerList.appendChild(layerItem);
    });

    updateInspector();
  }

  // Focus a specific widget
  function selectWidget(id) {
    selectedWidgetId = id;
    renderAll();
  }

  // Load selected properties into inspector
  function updateInspector() {
    if (!selectedWidgetId) {
      inspectorEmpty.style.display = 'block';
      inspectorContent.style.display = 'none';
      return;
    }

    const widget = widgets.find(w => w.id === selectedWidgetId);
    if (!widget) {
      selectedWidgetId = null;
      updateInspector();
      return;
    }

    inspectorEmpty.style.display = 'none';
    inspectorContent.style.display = 'block';

    inspectorType.textContent = widget.type;
    inspectX.value = widget.x;
    inspectY.value = widget.y;

    // Show/hide size range based on widget type
    if (widget.type === 'DIVIDER') {
      inspectSizeContainer.style.display = 'none';
      inspectDimensionsContainer.style.display = 'flex';
      inspectWidth.value = widget.w || 2;
      inspectHeight.value = widget.h || 320;
    } else {
      inspectSizeContainer.style.display = 'block';
      inspectDimensionsContainer.style.display = 'none';
      inspectSize.value = widget.size || 22;
      inspectValSize.textContent = `${inspectSize.value}px`;
      
      // Bounds depending on digit vs metadata
      if (widget.type === 'HOUR' || widget.type === 'MINUTE') {
        inspectSize.min = 50;
        inspectSize.max = 120;
      } else {
        inspectSize.min = 12;
        inspectSize.max = 36;
      }
    }

    // Color systems
    inspectColor.value = widget.color || 'primary';
    if (widget.color === 'custom') {
      inspectCustomColorContainer.style.display = 'block';
      inspectCustomColor.value = widget.customColor || '#ff5a36';
    } else {
      inspectCustomColorContainer.style.display = 'none';
    }

    // Complications: Icon styling & Progress Ring
    const isComplication = ['BATTERY', 'STEP', 'HEART', 'CAL', 'DISTANCE'].includes(widget.type);
    if (isComplication) {
      inspectIconStyleContainer.style.display = 'block';
      inspectIconStyle.value = widget.iconStyle || '1';
      inspectIconSizeContainer.style.display = 'block';
      inspectIconSize.value = widget.iconSize || 24;
      inspectValIconSize.textContent = `${inspectIconSize.value}px`;

      if (['BATTERY', 'STEP'].includes(widget.type)) {
        inspectProgressRingContainer.style.display = 'block';
        inspectProgressRing.checked = widget.showProgress || false;
      } else {
        inspectProgressRingContainer.style.display = 'none';
      }
    } else {
      inspectIconStyleContainer.style.display = 'none';
      inspectIconSizeContainer.style.display = 'none';
      inspectProgressRingContainer.style.display = 'none';
    }

    // Shortcut target
    inspectShortcut.value = widget.shortcut || 'DEFAULT';
  }

  // Properties form event handlers
  inspectX.addEventListener('input', (e) => {
    if (!selectedWidgetId) return;
    const w = widgets.find(x => x.id === selectedWidgetId);
    if (w) {
      w.x = parseInt(e.target.value) || 0;
      renderAll();
    }
  });
  inspectX.addEventListener('change', () => { pushState(); });

  inspectY.addEventListener('input', (e) => {
    if (!selectedWidgetId) return;
    const w = widgets.find(x => x.id === selectedWidgetId);
    if (w) {
      w.y = parseInt(e.target.value) || 0;
      renderAll();
    }
  });
  inspectY.addEventListener('change', () => { pushState(); });

  inspectSize.addEventListener('input', (e) => {
    if (!selectedWidgetId) return;
    const w = widgets.find(x => x.id === selectedWidgetId);
    if (w) {
      w.size = parseInt(e.target.value) || 22;
      inspectValSize.textContent = `${w.size}px`;
      renderAll();
    }
  });
  inspectSize.addEventListener('change', () => { pushState(); });

  inspectWidth.addEventListener('input', (e) => {
    if (!selectedWidgetId) return;
    const w = widgets.find(x => x.id === selectedWidgetId);
    if (w && w.type === 'DIVIDER') {
      w.w = parseInt(e.target.value) || 2;
      renderAll();
    }
  });
  inspectWidth.addEventListener('change', () => { pushState(); });

  inspectHeight.addEventListener('input', (e) => {
    if (!selectedWidgetId) return;
    const w = widgets.find(x => x.id === selectedWidgetId);
    if (w && w.type === 'DIVIDER') {
      w.h = parseInt(e.target.value) || 320;
      renderAll();
    }
  });
  inspectHeight.addEventListener('change', () => { pushState(); });

  inspectColor.addEventListener('change', (e) => {
    if (!selectedWidgetId) return;
    const w = widgets.find(x => x.id === selectedWidgetId);
    if (w) {
      w.color = e.target.value;
      if (w.color === 'custom') {
        w.customColor = inspectCustomColor.value;
      }
      inspectCustomColorContainer.style.display = w.color === 'custom' ? 'block' : 'none';
      renderAll();
      pushState();
    }
  });

  inspectCustomColor.addEventListener('input', (e) => {
    if (!selectedWidgetId) return;
    const w = widgets.find(x => x.id === selectedWidgetId);
    if (w && w.color === 'custom') {
      w.customColor = e.target.value;
      renderAll();
    }
  });
  inspectCustomColor.addEventListener('change', () => { pushState(); });

  inspectIconStyle.addEventListener('change', (e) => {
    if (!selectedWidgetId) return;
    const w = widgets.find(x => x.id === selectedWidgetId);
    if (w) {
      w.iconStyle = e.target.value;
      renderAll();
      pushState();
    }
  });

  inspectIconSize.addEventListener('input', (e) => {
    if (!selectedWidgetId) return;
    const w = widgets.find(x => x.id === selectedWidgetId);
    if (w) {
      w.iconSize = parseInt(e.target.value) || 24;
      inspectValIconSize.textContent = `${w.iconSize}px`;
      renderAll();
    }
  });
  inspectIconSize.addEventListener('change', () => { pushState(); });

  inspectProgressRing.addEventListener('change', (e) => {
    if (!selectedWidgetId) return;
    const w = widgets.find(x => x.id === selectedWidgetId);
    if (w) {
      w.showProgress = e.target.checked;
      renderAll();
      pushState();
    }
  });

  inspectShortcut.addEventListener('change', (e) => {
    if (!selectedWidgetId) return;
    const w = widgets.find(x => x.id === selectedWidgetId);
    if (w) {
      w.shortcut = e.target.value;
      renderAll();
      pushState();
    }
  });

  // Adding components palette
  btnAddComponent.addEventListener('click', () => {
    const type = addComponentSelect.value;
    if (!type) return;

    // Check if hour/minute/divider already exists
    if (['HOUR', 'MINUTE', 'DIVIDER'].includes(type)) {
      const exists = widgets.some(w => w.type === type);
      if (exists) {
        alert(`You can only have one ${type} widget.`);
        return;
      }
    }

    const newWidget = {
      id: `widget_${Date.now()}`,
      type: type,
      x: 180,
      y: 180,
      size: ['HOUR', 'MINUTE'].includes(type) ? 96 : 22,
      color: ['MINUTE', 'BATTERY', 'WEEKDAY', 'DATE'].includes(type) ? 'secondary' : 'primary'
    };

    if (type === 'DIVIDER') {
      newWidget.w = 2;
      newWidget.h = 320;
      newWidget.x = 226;
      newWidget.y = 67;
    }

    widgets.push(newWidget);
    selectWidget(newWidget.id);
  });

  // Deleting components
  btnDeleteWidget.addEventListener('click', () => {
    if (!selectedWidgetId) return;
    widgets = widgets.filter(w => w.id !== selectedWidgetId);
    selectedWidgetId = null;
    renderAll();
  });

  // Drag and Drop Logic
  widgetsContainer.addEventListener('mousedown', (e) => {
    const target = e.target.closest('.wf-widget');
    if (!target) return;

    e.preventDefault();
    const id = target.getAttribute('data-id');
    selectWidget(id);

    const widget = widgets.find(w => w.id === id);
    if (!widget) return;

    isDragging = true;
    activeDragWidget = widget;

    // Get unscaled mouse positions relative to watchface
    const rect = wfPreview.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / scale;
    const mouseY = (e.clientY - rect.top) / scale;

    dragOffset.x = mouseX - widget.x;
    dragOffset.y = mouseY - widget.y;
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging || !activeDragWidget) return;

    const rect = wfPreview.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / scale;
    const mouseY = (e.clientY - rect.top) / scale;

    let targetX = Math.round(mouseX - dragOffset.x);
    let targetY = Math.round(mouseY - dragOffset.y);

    const bounds = getWidgetBounds(activeDragWidget);
    let snappedV = false;
    let snappedH = false;
    let snappedXVal = 227;
    let snappedYVal = 227;

    const centerX = targetX + bounds.w / 2;
    const centerY = targetY + bounds.h / 2;

    // 1. Check screen center axes snapping first
    if (Math.abs(centerX - 227) < 10) {
      targetX = 227 - bounds.w / 2;
      snappedV = true;
      snappedXVal = 227;
    }
    if (Math.abs(centerY - 227) < 10) {
      targetY = 227 - bounds.h / 2;
      snappedH = true;
      snappedYVal = 227;
    }

    // 2. Check component-to-component relative snapping
    widgets.forEach(o => {
      if (o.id === activeDragWidget.id) return; // skip self

      const oBounds = getWidgetBounds(o);
      const oCenterX = o.x + oBounds.w / 2;
      const oCenterY = o.y + oBounds.h / 2;

      // Horizontal snapping (vertical alignment line)
      if (!snappedV) {
        // Snap center-to-center
        if (Math.abs(centerX - oCenterX) < 10) {
          targetX = oCenterX - bounds.w / 2;
          snappedV = true;
          snappedXVal = oCenterX;
        }
        // Snap left-to-left
        else if (Math.abs(targetX - o.x) < 10) {
          targetX = o.x;
          snappedV = true;
          snappedXVal = o.x;
        }
        // Snap right-to-right
        else if (Math.abs((targetX + bounds.w) - (o.x + oBounds.w)) < 10) {
          targetX = o.x + oBounds.w - bounds.w;
          snappedV = true;
          snappedXVal = o.x + oBounds.w;
        }
        // Snap left-to-right (horizontal gap snapping)
        else if (Math.abs(targetX - (o.x + oBounds.w)) < 10) {
          targetX = o.x + oBounds.w;
          snappedV = true;
          snappedXVal = o.x + oBounds.w;
        }
        // Snap right-to-left (horizontal gap snapping)
        else if (Math.abs((targetX + bounds.w) - o.x) < 10) {
          targetX = o.x - bounds.w;
          snappedV = true;
          snappedXVal = o.x;
        }
      }

      // Vertical snapping (horizontal alignment line)
      if (!snappedH) {
        // Snap center-to-center
        if (Math.abs(centerY - oCenterY) < 10) {
          targetY = oCenterY - bounds.h / 2;
          snappedH = true;
          snappedYVal = oCenterY;
        }
        // Snap top-to-top
        else if (Math.abs(targetY - o.y) < 10) {
          targetY = o.y;
          snappedH = true;
          snappedYVal = o.y;
        }
        // Snap bottom-to-bottom
        else if (Math.abs((targetY + bounds.h) - (o.y + oBounds.h)) < 10) {
          targetY = o.y + oBounds.h - bounds.h;
          snappedH = true;
          snappedYVal = o.y + oBounds.h;
        }
        // Snap top-to-bottom (vertical gap snapping)
        else if (Math.abs(targetY - (o.y + oBounds.h)) < 10) {
          targetY = o.y + oBounds.h;
          snappedH = true;
          snappedYVal = o.y + oBounds.h;
        }
        // Snap bottom-to-top (vertical gap snapping)
        else if (Math.abs((targetY + bounds.h) - o.y) < 10) {
          targetY = o.y - bounds.h;
          snappedH = true;
          snappedYVal = o.y;
        }
      }
    });

    // Display and position guide lines dynamically
    if (snappedV) {
      guideV.style.left = `${snappedXVal}px`;
      guideV.style.display = 'block';
    } else {
      guideV.style.display = 'none';
    }

    if (snappedH) {
      guideH.style.top = `${snappedYVal}px`;
      guideH.style.display = 'block';
    } else {
      guideH.style.display = 'none';
    }

    // Constrain inside bezel circle boundaries
    targetX = Math.max(0, Math.min(454 - bounds.w, targetX));
    targetY = Math.max(0, Math.min(454 - bounds.h, targetY));

    activeDragWidget.x = targetX;
    activeDragWidget.y = targetY;

    // Instantly update layout
    renderAll();
  });

  window.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      activeDragWidget = null;
      guideV.style.display = 'none';
      guideH.style.display = 'none';
    }
  });

  // Fetch configs payload
  function getPayload() {
    return {
      themeIndex: currentThemeIndex,
      hourColor: colorGlobalPrimary.value,
      minuteColor: PRESETS[currentThemeIndex].secondary,
      lineColor: colorGlobalPrimary.value,
      stepsColor: colorGlobalPrimary.value,
      batteryLow: 20,
      batteryHigh: 80,
      appName: appNameInput.value,
      appId: parseInt(appIdInput.value),
      fontFamily: fontFamilySelect.value,
      backgroundStyle: backgroundStyleSelect.value,
      backgroundScale: parseInt(bgScaleInput.value),
      backgroundX: parseInt(bgXInput.value),
      backgroundY: parseInt(bgYInput.value),
      backgroundSpacing: parseInt(bgSpacingInput.value),
      backgroundOpacity: parseInt(bgOpacityInput.value),
      backgroundRotation: parseInt(bgRotationInput.value),
      widgets: widgets
    };
  }

  // Save Event
  btnSave.addEventListener('click', () => {
    const payload = getPayload();
    btnSave.textContent = 'Saving...';
    btnSave.disabled = true;

    fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          alert('Configuration saved successfully! Watchface code generated.');
          if (data.config && data.config.appId) {
            appIdInput.value = data.config.appId;
          }
        } else {
          alert('Error saving configuration.');
        }
      })
      .catch(err => {
        console.error(err);
        alert('API Error while saving.');
      })
      .finally(() => {
        btnSave.textContent = 'Save Configuration';
        btnSave.disabled = false;
      });
  });

  // Build Event
  btnBuild.addEventListener('click', () => {
    const payload = getPayload();
    btnBuild.textContent = 'Compiling...';
    btnBuild.disabled = true;
    btnSave.disabled = true;
    buildLoader.style.display = 'flex';
    qrOutputContainer.style.display = 'none';

    fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(data => {
        if (!data.success) throw new Error('Save failed prior to building');
        return fetch('/api/build', { method: 'POST' });
      })
      .then(res => {
        if (!res.ok) {
          return res.json().then(errData => {
            throw new Error(errData.details || 'Build process failed');
          });
        }
        return res.json();
      })
      .then(data => {
        if (data.success && data.qr) {
          qrImg.src = data.qr;
          qrOutputContainer.style.display = 'flex';
          qrOutputContainer.scrollIntoView({ behavior: 'smooth' });
        } else {
          alert('Build succeeded but failed to retrieve QR code.');
        }
      })
      .catch(err => {
        console.error(err);
        alert(`Error compiling watchface:\n\n${err.message}`);
      })
      .finally(() => {
        btnBuild.textContent = 'Compile & Generate QR';
        btnBuild.disabled = false;
        btnSave.disabled = false;
        buildLoader.style.display = 'none';
      });
  });

  // --- Undo/Redo & AOD Preview Engine ---

  function pushState() {
    const state = JSON.stringify({
      themeIndex: currentThemeIndex,
      hourColor: colorGlobalPrimary.value,
      fontFamily: fontFamilySelect.value,
      appName: appNameInput.value,
      appId: appIdInput.value,
      backgroundStyle: backgroundStyleSelect.value,
      backgroundScale: bgScaleInput.value,
      backgroundX: bgXInput.value,
      backgroundY: bgYInput.value,
      backgroundSpacing: bgSpacingInput.value,
      backgroundOpacity: bgOpacityInput.value,
      backgroundRotation: bgRotationInput.value,
      widgets: JSON.parse(JSON.stringify(widgets))
    });
    
    if (undoStack.length === 0 || undoStack[undoStack.length - 1] !== state) {
      undoStack.push(state);
      if (undoStack.length > 50) undoStack.shift();
      redoStack.length = 0; // Clear redo history on new action
    }
  }

  function applyState(state) {
    currentThemeIndex = state.themeIndex;
    colorGlobalPrimary.value = state.hourColor;
    fontFamilySelect.value = state.fontFamily;
    appNameInput.value = state.appName;
    appIdInput.value = state.appId;
    backgroundStyleSelect.value = state.backgroundStyle;
    bgScaleInput.value = state.backgroundScale;
    bgXInput.value = state.backgroundX;
    bgYInput.value = state.backgroundY;
    bgSpacingInput.value = state.backgroundSpacing;
    bgOpacityInput.value = state.backgroundOpacity;
    bgRotationInput.value = state.backgroundRotation;
    
    widgets = state.widgets;

    presetButtons.forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.preset) === currentThemeIndex);
    });

    updateGlobalStyles();
    renderAll();
  }

  // Undo button click
  document.getElementById('btnUndo').addEventListener('click', () => {
    if (undoStack.length > 1) {
      const currentState = undoStack.pop();
      redoStack.push(currentState);
      const prevState = undoStack[undoStack.length - 1];
      applyState(JSON.parse(prevState));
    }
  });

  // Redo button click
  document.getElementById('btnRedo').addEventListener('click', () => {
    if (redoStack.length > 0) {
      const nextState = JSON.parse(redoStack.pop());
      undoStack.push(JSON.stringify(nextState));
      applyState(nextState);
    }
  });

  // Keyboard binds (Ctrl+Z / Ctrl+Y)
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      document.getElementById('btnUndo').click();
    }
    if (e.ctrlKey && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      document.getElementById('btnRedo').click();
    }
  });

  // AOD Mode Toggle
  const btnToggleAod = document.getElementById('btnToggleAod');
  btnToggleAod.addEventListener('click', () => {
    isAodMode = !isAodMode;
    if (isAodMode) {
      btnToggleAod.textContent = '☀️ Awake Mode';
      btnToggleAod.classList.add('btn-primary');
      btnToggleAod.classList.remove('btn-secondary');
    } else {
      btnToggleAod.textContent = '🌙 AOD Mode';
      btnToggleAod.classList.add('btn-secondary');
      btnToggleAod.classList.remove('btn-primary');
    }
    updateGlobalStyles();
    renderAll();
  });
});
