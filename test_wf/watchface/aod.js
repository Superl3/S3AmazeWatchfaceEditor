const THEMES = [
  {
    line: 0xff7b90,
    minute: 0xfff0f2,
    steps: 0xff7b90
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
    this.currentThemeIndex = 1
    try {
      this.currentThemeIndex = hmFS.SysProGetInt('theme_idx') !== undefined ? hmFS.SysProGetInt('theme_idx') : 1
      if (this.currentThemeIndex < 0 || this.currentThemeIndex >= THEMES.length) {
        this.currentThemeIndex = 1
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


    // Hour Widget (AOD)
    this.hourTextWidget = hmUI.createWidget(hmUI.widget.TEXT_IMG, {
      x: 40,
      y: 148,
      w: 180,
      h: 130,
      font_array: [
        'h_${this.currentThemeIndex}_0.png', 'h_${this.currentThemeIndex}_1.png', 'h_${this.currentThemeIndex}_2.png', 'h_${this.currentThemeIndex}_3.png', 'h_${this.currentThemeIndex}_4.png',
        'h_${this.currentThemeIndex}_5.png', 'h_${this.currentThemeIndex}_6.png', 'h_${this.currentThemeIndex}_7.png', 'h_${this.currentThemeIndex}_8.png', 'h_${this.currentThemeIndex}_9.png'
      ],
      h_space: 2,
      text: '00'
    })
      
    // Minute Widget (AOD)
    this.minuteTextWidget = hmUI.createWidget(hmUI.widget.TEXT_IMG, {
      x: 244,
      y: 148,
      w: 180,
      h: 130,
      font_array: [
        'm_${this.currentThemeIndex}_0.png', 'm_${this.currentThemeIndex}_1.png', 'm_${this.currentThemeIndex}_2.png', 'm_${this.currentThemeIndex}_3.png', 'm_${this.currentThemeIndex}_4.png',
        'm_${this.currentThemeIndex}_5.png', 'm_${this.currentThemeIndex}_6.png', 'm_${this.currentThemeIndex}_7.png', 'm_${this.currentThemeIndex}_8.png', 'm_${this.currentThemeIndex}_9.png'
      ],
      h_space: 2,
      text: '00'
    })
      
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
    if (this.hourTextWidget) {
      this.hourTextWidget.setProperty(hmUI.prop.MORE, {
        font_array: [
          'h_' + t + '_0.png', 'h_' + t + '_1.png', 'h_' + t + '_2.png', 'h_' + t + '_3.png', 'h_' + t + '_4.png',
          'h_' + t + '_5.png', 'h_' + t + '_6.png', 'h_' + t + '_7.png', 'h_' + t + '_8.png', 'h_' + t + '_9.png'
        ]
      })
    }
    if (this.minuteTextWidget) {
      this.minuteTextWidget.setProperty(hmUI.prop.MORE, {
        font_array: [
          'm_' + t + '_0.png', 'm_' + t + '_1.png', 'm_' + t + '_2.png', 'm_' + t + '_3.png', 'm_' + t + '_4.png',
          'm_' + t + '_5.png', 'm_' + t + '_6.png', 'm_' + t + '_7.png', 'm_' + t + '_8.png', 'm_' + t + '_9.png'
        ]
      })
    }
    if (this.centerLineWidget) {
      this.centerLineWidget.setProperty(hmUI.prop.MORE, {
        color: theme.line
      })
    }
  },

  updateTime() {
    const hour = this.timeSensor.hour
    const minute = this.timeSensor.minute
    
    const hh = hour < 10 ? '0' + hour : '' + hour
    const mm = minute < 10 ? '0' + minute : '' + minute

    if (this.hourTextWidget) {
      this.hourTextWidget.setProperty(hmUI.prop.TEXT, hh)
    }
    if (this.minuteTextWidget) {
      this.minuteTextWidget.setProperty(hmUI.prop.TEXT, mm)
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