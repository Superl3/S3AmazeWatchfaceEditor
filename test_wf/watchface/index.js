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
    console.log('index page.js on init invoke')
    this.timeSensor = hmSensor.createSensor(hmSensor.id.TIME)
    this.batterySensor = hmSensor.createSensor(hmSensor.id.BATTERY)
    this.stepSensor = hmSensor.createSensor(hmSensor.id.STEP)
    this.heartSensor = hmSensor.createSensor(hmSensor.id.HEART)

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
    console.log('index page.js on build invoke')

    hmUI.createWidget(hmUI.widget.ARC, {
      x: 12,
      y: 12,
      w: 430,
      h: 430,
      start_angle: 0,
      end_angle: 360,
      color: 0x222633,
      line_width: 1
    })


    // Background Image Pattern
    hmUI.createWidget(hmUI.widget.IMG, {
      x: 0,
      y: 0,
      w: 454,
      h: 454,
      alpha: 102,
      src: 'bg_maze.png'
    })
    
    // Hour Widgets (one per theme)
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
        
    // Minute Widgets (one per theme)
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
        
    // Divider Accent Line
    const activeTheme = THEMES[this.currentThemeIndex]
    this.centerLineWidget = hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 226,
      y: 67,
      w: 2,
      h: 320,
      color: activeTheme.line
    })

    // Theme Switcher Hotspot
    const themeHotspot = hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 210,
      y: 67,
      w: 34,
      h: 320,
      color: 0x000000,
      alpha: 0
    })
    themeHotspot.addEventListener(hmUI.event.CLICK_DOWN, () => {
      this.cycleTheme()
    })
      
    // Battery Complication (one per theme)
    
    
    this.batteryOutline = hmUI.createWidget(hmUI.widget.FILL_RECT, { x: 195, y: 20, w: 16, h: 10, radius: 1, color: 0x4a4e5d })
    hmUI.createWidget(hmUI.widget.FILL_RECT, { x: 196, y: 21, w: 14, h: 8, radius: 0, color: 0x000000 })
    this.batteryTip = hmUI.createWidget(hmUI.widget.FILL_RECT, { x: 211, y: 23, w: 1, h: 4, color: 0x4a4e5d })
    this.batteryFillWidget = hmUI.createWidget(hmUI.widget.FILL_RECT, { x: 197, y: 22, w: 12, h: 6, color: 0x8a90a6 })
          
    this.batteryTextWidgets = []
    for (let i = 0; i < THEMES.length; i++) {
      this.batteryTextWidgets.push(hmUI.createWidget(hmUI.widget.TEXT_IMG, {
        x: 217,
        y: 9,
        w: 70,
        h: 30,
        font_array: [
        'b_' + i + '_0.png', 'b_' + i + '_1.png', 'b_' + i + '_2.png', 'b_' + i + '_3.png', 'b_' + i + '_4.png',
        'b_' + i + '_5.png', 'b_' + i + '_6.png', 'b_' + i + '_7.png', 'b_' + i + '_8.png', 'b_' + i + '_9.png'
      ],
        h_space: 1,
        text: ''
      }))
    }
    
    // Shortcut Touch Area for BATTERY
    hmUI.createWidget(hmUI.widget.IMG_CLICK, {
      x: 195,
      y: 13,
      w: 100,
      h: 30,
      src: 'transparent.png',
      type: hmUI.data_type.BATTERY
    })
      
        
    // Heart Rate Complication (one per theme)
    this.heartIconWidget = hmUI.createWidget(hmUI.widget.IMG, {
      x: 115,
      y: 301,
      src: 'heart_' + this.currentThemeIndex + '.png'
    })
    this.heartTextWidgets = []
    for (let i = 0; i < THEMES.length; i++) {
      this.heartTextWidgets.push(hmUI.createWidget(hmUI.widget.TEXT_IMG, {
        x: 145,
        y: 297,
        w: 74,
        h: 30,
        font_array: [
        'hr_' + i + '_0.png', 'hr_' + i + '_1.png', 'hr_' + i + '_2.png', 'hr_' + i + '_3.png', 'hr_' + i + '_4.png',
        'hr_' + i + '_5.png', 'hr_' + i + '_6.png', 'hr_' + i + '_7.png', 'hr_' + i + '_8.png', 'hr_' + i + '_9.png'
      ],
        h_space: 1,
        text: ''
      }))
    }
    
    // Shortcut Touch Area for HEART
    hmUI.createWidget(hmUI.widget.IMG_CLICK, {
      x: 115,
      y: 301,
      w: 100,
      h: 30,
      src: 'transparent.png',
      type: hmUI.data_type.HEART
    })
      
        
    // Weekday Widget (IMG)
    this.weekdayTextWidget = hmUI.createWidget(hmUI.widget.IMG, {
      x: 115,
      y: 326,
      src: 'w_' + this.currentThemeIndex + '_week_1.png'
    })
    
      
    // Steps Complication (one per theme)
    
    this.stepsIconWidget = hmUI.createWidget(hmUI.widget.IMG, {
      x: 239,
      y: 301,
      src: 'step_' + this.currentThemeIndex + '.png'
    })
    this.stepsTextWidgets = []
    for (let i = 0; i < THEMES.length; i++) {
      this.stepsTextWidgets.push(hmUI.createWidget(hmUI.widget.TEXT_IMG, {
        x: 269,
        y: 297,
        w: 74,
        h: 30,
        font_array: [
        's_' + i + '_0.png', 's_' + i + '_1.png', 's_' + i + '_2.png', 's_' + i + '_3.png', 's_' + i + '_4.png',
        's_' + i + '_5.png', 's_' + i + '_6.png', 's_' + i + '_7.png', 's_' + i + '_8.png', 's_' + i + '_9.png'
      ],
        h_space: 1,
        text: ''
      }))
    }
    
    // Shortcut Touch Area for STEP
    hmUI.createWidget(hmUI.widget.IMG_CLICK, {
      x: 239,
      y: 301,
      w: 100,
      h: 30,
      src: 'transparent.png',
      type: hmUI.data_type.STEP
    })
      
        
    // Date Widget (one per theme)
    this.monthWidget = hmUI.createWidget(hmUI.widget.IMG, {
      x: 239,
      y: 326,
      src: 'mon_' + this.currentThemeIndex + '_month_1.png'
    })
    this.dayWidgets = []
    for (let i = 0; i < THEMES.length; i++) {
      this.dayWidgets.push(hmUI.createWidget(hmUI.widget.TEXT_IMG, {
        x: 273,
        y: 326,
        font_array: [
        'dt_' + i + '_0.png', 'dt_' + i + '_1.png', 'dt_' + i + '_2.png', 'dt_' + i + '_3.png', 'dt_' + i + '_4.png',
        'dt_' + i + '_5.png', 'dt_' + i + '_6.png', 'dt_' + i + '_7.png', 'dt_' + i + '_8.png', 'dt_' + i + '_9.png'
      ],
        h_space: 1,
        text: '01'
      }))
    }
    
        
    this.applyThemeColors()
    this.updateTime()
        this.updateBattery()
        this.updateHeart()
        this.updateSteps()

    this.setupListeners()
  },

  setupListeners() {
    const updateTimeCb = () => this.updateTime()
    const updateBatteryCb = () => this.updateBattery()
    const updateStepsCb = () => this.updateSteps()
    const updateHeartCb = () => this.updateHeart()

    // Register sensor change listeners
    this.batterySensor.addEventListener(hmSensor.event.CHANGE, updateBatteryCb)
    this.stepSensor.addEventListener(hmSensor.event.CHANGE, updateStepsCb)
    this.heartSensor.addEventListener(hmSensor.event.CHANGE, updateHeartCb)

    this.timeTimer = timer.createTimer(0, 1000, updateTimeCb)

    hmUI.createWidget(hmUI.widget.WIDGET_DELEGATE, {
      resume_call: () => {
        console.log('Watchface resumed')
        if (!this.timeTimer) {
          this.timeTimer = timer.createTimer(0, 1000, updateTimeCb)
        }
        this.applyThemeColors()
        this.updateTime()
        this.updateBattery()
        this.updateHeart()
        this.updateSteps()
      },
      pause_call: () => {
        console.log('Watchface paused')
        if (this.timeTimer) {
          timer.stopTimer(this.timeTimer)
          this.timeTimer = null
        }
      }
    })
  },

  cycleTheme() {
    this.currentThemeIndex = (this.currentThemeIndex + 1) % THEMES.length
    try {
      hmFS.SysProSetInt('theme_idx', this.currentThemeIndex)
    } catch (e) {
      console.log('Save theme index failed', e)
    }
    this.applyThemeColors()
  },

  applyThemeColors() {
    const t = this.currentThemeIndex
    const theme = THEMES[t]
    

    for (let i = 0; i < THEMES.length; i++) {
      const visible = (i === t)
      if (this.hourTextWidgets && this.hourTextWidgets[i]) this.hourTextWidgets[i].setProperty(hmUI.prop.VISIBLE, visible)
      if (this.minuteTextWidgets && this.minuteTextWidgets[i]) this.minuteTextWidgets[i].setProperty(hmUI.prop.VISIBLE, visible)
      if (this.batteryTextWidgets && this.batteryTextWidgets[i]) this.batteryTextWidgets[i].setProperty(hmUI.prop.VISIBLE, visible)
      if (this.stepsTextWidgets && this.stepsTextWidgets[i]) this.stepsTextWidgets[i].setProperty(hmUI.prop.VISIBLE, visible)
      if (this.heartTextWidgets && this.heartTextWidgets[i]) this.heartTextWidgets[i].setProperty(hmUI.prop.VISIBLE, visible)
      if (this.calTextWidgets && this.calTextWidgets[i]) this.calTextWidgets[i].setProperty(hmUI.prop.VISIBLE, visible)
      if (this.distanceTextWidgets && this.distanceTextWidgets[i]) this.distanceTextWidgets[i].setProperty(hmUI.prop.VISIBLE, visible)
      if (this.dayWidgets && this.dayWidgets[i]) this.dayWidgets[i].setProperty(hmUI.prop.VISIBLE, visible)
    }
      if (this.centerLineWidget) {
      this.centerLineWidget.setProperty(hmUI.prop.MORE, {
        color: theme.line
      })
    }
    if (this.batteryOutline) this.batteryOutline.setProperty(hmUI.prop.COLOR, theme.line)
    if (this.batteryTip) this.batteryTip.setProperty(hmUI.prop.COLOR, theme.line)
    if (this.heartIconWidget) {
      this.heartIconWidget.setProperty(hmUI.prop.SRC, 'heart_' + t + '.png')
    }
    if (this.weekdayTextWidget) {
      const weekIndex = this.timeSensor.week
      this.weekdayTextWidget.setProperty(hmUI.prop.SRC, 'w_' + t + '_week_' + weekIndex + '.png')
    }
    if (this.stepsIconWidget) {
      this.stepsIconWidget.setProperty(hmUI.prop.SRC, 'step_' + t + '.png')
    }
    if (this.monthWidget) {
      const monthIndex = this.timeSensor.month
      this.monthWidget.setProperty(hmUI.prop.SRC, 'mon_' + t + '_month_' + monthIndex + '.png')
    }

    this.updateBattery()
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

    const weekIndex = this.timeSensor.week
    if (this.weekdayTextWidget) {
      const t = this.currentThemeIndex
      this.weekdayTextWidget.setProperty(hmUI.prop.SRC, 'w_' + t + '_week_' + weekIndex + '.png')
    }

    const day = this.timeSensor.day
    const monthIndex = this.timeSensor.month
    if (this.monthWidget) {
      const t = this.currentThemeIndex
      this.monthWidget.setProperty(hmUI.prop.SRC, 'mon_' + t + '_month_' + monthIndex + '.png')
    }
    if (this.dayWidgets) {
      const dd = day < 10 ? '0' + day : '' + day
      for (let i = 0; i < THEMES.length; i++) {
        if (this.dayWidgets[i]) this.dayWidgets[i].setProperty(hmUI.prop.TEXT, dd)
      }
    }
  },

  updateBattery() {
    if (!this.batteryTextWidgets) return
    const batteryVal = this.batterySensor.current
    for (let i = 0; i < THEMES.length; i++) {
      if (this.batteryTextWidgets[i]) this.batteryTextWidgets[i].setProperty(hmUI.prop.TEXT, batteryVal.toString())
    }

    // Update battery fill color and width
    const maxW = 12;
    const w_charge = Math.max(1, Math.round(maxW * (batteryVal / 100)))
    let batteryColor = 0xeaf4ff
    if (batteryVal <= 20) {
      batteryColor = 0xff2c2c // Red
    } else if (batteryVal >= 80) {
      batteryColor = 0x00ff7f // Green
    }
    
    if (this.batteryFillWidget) {
      this.batteryFillWidget.setProperty(hmUI.prop.MORE, {
        w: w_charge,
        color: batteryColor
      })
    }
    
  },
  updateSteps() {
    if (!this.stepsTextWidgets) return
    const stepsVal = this.stepSensor.current
    for (let i = 0; i < THEMES.length; i++) {
      if (this.stepsTextWidgets[i]) this.stepsTextWidgets[i].setProperty(hmUI.prop.TEXT, stepsVal.toString())
    }
    
  },
  updateHeart() {
    if (!this.heartTextWidgets) return
    const hrVal = this.heartSensor.last || 0
    const valStr = hrVal > 0 ? hrVal.toString() : '0'
    for (let i = 0; i < THEMES.length; i++) {
      if (this.heartTextWidgets[i]) this.heartTextWidgets[i].setProperty(hmUI.prop.TEXT, valStr)
    }
  },
  onDestroy() {
    console.log('index page.js on destroy invoke')
    if (this.timeTimer) {
      timer.stopTimer(this.timeTimer)
      this.timeTimer = null
    }
  }
})