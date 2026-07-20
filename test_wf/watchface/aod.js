const THEMES = [
  {
    line: 0xff5a36,
    minute: 0xeaf4ff,
    steps: 0xff5a36
  },
  {
    line: 0xff7b90,    // Strawberry Yogurt
    minute: 0xfff0f2,
    steps: 0xff7b90
  },
  {
    line: 0x7cd1a1,    // Mint Pistachio
    minute: 0xf0faf4,
    steps: 0x7cd1a1
  },
  {
    line: 0x8f9eff,    // Blueberry Lavender
    minute: 0xf2f4ff,
    steps: 0x8f9eff
  },
  {
    line: 0xffd670,    // Banana Cream
    minute: 0xfffcf2,
    steps: 0xffd670
  },
  {
    line: 0xff9e7d,    // Soft Peach Melba
    minute: 0xfff5f2,
    steps: 0xff9e7d
  }
]

WatchFace({
  onInit() {
    console.log('aod page.js on init invoke')
    this.timeSensor = hmSensor.createSensor(hmSensor.id.TIME)
    this.currentThemeIndex = 0
    try {
      this.currentThemeIndex = hmFS.SysProGetInt('theme_idx') !== undefined ? hmFS.SysProGetInt('theme_idx') : 0
      if (this.currentThemeIndex < 0 || this.currentThemeIndex >= THEMES.length) {
        this.currentThemeIndex = 0
      }
    } catch (e) {
      console.log('Read theme index failed', e)
    }
  },

  build() {
    console.log('aod page.js on build invoke')
    
    // Outer boundary ring
    hmUI.createWidget(hmUI.widget.ARC, {
      x: 12,
      y: 12,
      w: 430,
      h: 430,
      start_angle: 0,
      end_angle: 360,
      color: 0x11131a,
      line_width: 1
    })


    // Hour Widgets (AOD - one per theme)
    this.hourTextWidgets = []
    for (let i = 0; i < THEMES.length; i++) {
      this.hourTextWidgets.push(hmUI.createWidget(hmUI.widget.TEXT_IMG, {
        x: 40,
        y: 148,
        w: 180,
        h: 130,
        font_array: [
          'h_' + i + '_0.png', 'h_' + i + '_1.png', 'h_' + i + '_2.png', 'h_' + i + '_3.png', 'h_' + i + '_4.png',
          'h_' + i + '_5.png', 'h_' + i + '_6.png', 'h_' + i + '_7.png', 'h_' + i + '_8.png', 'h_' + i + '_9.png'
        ],
        h_space: 2,
        text: '00'
      }))
    }
      
    // Minute Widgets (AOD - one per theme)
    this.minuteTextWidgets = []
    for (let i = 0; i < THEMES.length; i++) {
      this.minuteTextWidgets.push(hmUI.createWidget(hmUI.widget.TEXT_IMG, {
        x: 244,
        y: 148,
        w: 180,
        h: 130,
        font_array: [
          'm_' + i + '_0.png', 'm_' + i + '_1.png', 'm_' + i + '_2.png', 'm_' + i + '_3.png', 'm_' + i + '_4.png',
          'm_' + i + '_5.png', 'm_' + i + '_6.png', 'm_' + i + '_7.png', 'm_' + i + '_8.png', 'm_' + i + '_9.png'
        ],
        h_space: 2,
        text: '00'
      }))
    }
      
    // Divider Accent Line (AOD)
    this.centerLineWidget = hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 226,
      y: 67,
      w: 2,
      h: 320,
      color: 0x4a4e5d
    })
      
    this.applyThemeColors()
    this.updateTime()
    this.setupListeners()
  },

  setupListeners() {
    const updateTimeCb = () => this.updateTime()
    // Timer updates every 60 seconds inside AOD mode to conserve battery
    this.timeTimer = timer.createTimer(0, 60000, updateTimeCb)

    hmUI.createWidget(hmUI.widget.WIDGET_DELEGATE, {
      resume_call: () => {
        if (!this.timeTimer) {
          this.timeTimer = timer.createTimer(0, 60000, updateTimeCb)
        }
        this.applyThemeColors()
        this.updateTime()
      },
      pause_call: () => {
        if (this.timeTimer) {
          timer.stopTimer(this.timeTimer)
          this.timeTimer = null
        }
      }
    })
  },

  applyThemeColors() {
    const t = this.currentThemeIndex
    const theme = THEMES[t]
    
    for (let i = 0; i < THEMES.length; i++) {
      const visible = (i === t)
      if (this.hourTextWidgets && this.hourTextWidgets[i]) this.hourTextWidgets[i].setProperty(hmUI.prop.VISIBLE, visible)
      if (this.minuteTextWidgets && this.minuteTextWidgets[i]) this.minuteTextWidgets[i].setProperty(hmUI.prop.VISIBLE, visible)
    }

    if (this.centerLineWidget) {
      this.centerLineWidget.setProperty(hmUI.prop.COLOR, theme.line)
    }
  },

  updateTime() {
    const hour = this.timeSensor.hour
    const minute = this.timeSensor.minute
    
    const hh = hour < 10 ? '0' + hour : '' + hour
    const mm = minute < 10 ? '0' + minute : '' + minute

    if (this.hourTextWidgets) {
      for (let i = 0; i < THEMES.length; i++) {
        if (this.hourTextWidgets[i]) this.hourTextWidgets[i].setProperty(hmUI.prop.TEXT, hh)
      }
    }
    if (this.minuteTextWidgets) {
      for (let i = 0; i < THEMES.length; i++) {
        if (this.minuteTextWidgets[i]) this.minuteTextWidgets[i].setProperty(hmUI.prop.TEXT, mm)
      }
    }
  },

  onDestroy() {
    console.log('aod page.js on destroy invoke')
    if (this.timeTimer) {
      timer.stopTimer(this.timeTimer)
      this.timeTimer = null
    }
  }
})