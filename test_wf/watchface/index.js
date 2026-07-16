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


    // Background Image Pattern (Scaled & Positioned)
    hmUI.createWidget(hmUI.widget.IMG, {
      x: 0,
      y: 0,
      w: 454,
      h: 454,
      alpha: 102,
      src: 'bg_maze.png'
    })
    
    // Hour Widget
    this.hourTextWidget = hmUI.createWidget(hmUI.widget.TEXT, {
      x: 40,
      y: 148,
      w: 180,
      h: 130,
      text_size: 96,
      color: 0x000000,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
      font: 'fonts/Outfit-ExtraBold.ttf',
      text: '00'
    })
      
    // Minute Widget
    this.minuteTextWidget = hmUI.createWidget(hmUI.widget.TEXT, {
      x: 244,
      y: 148,
      w: 180,
      h: 130,
      text_size: 96,
      color: 0x000000,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
      font: 'fonts/Outfit-ExtraBold.ttf',
      text: '00'
    })
      
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
      
    // Battery Complication
    
    
    hmUI.createWidget(hmUI.widget.FILL_RECT, { x: 115, y: 305, w: 24, h: 14, radius: 2, color: 0x4a4e5d })
    hmUI.createWidget(hmUI.widget.FILL_RECT, { x: 116, y: 306, w: 22, h: 12, radius: 1, color: 0x000000 })
    hmUI.createWidget(hmUI.widget.FILL_RECT, { x: 139, y: 309, w: 2, h: 6, color: 0x4a4e5d })
    this.batteryFillWidget = hmUI.createWidget(hmUI.widget.FILL_RECT, { x: 118, y: 308, w: 18, h: 8, color: 0x8a90a6 })
        
    this.batteryTextWidget = hmUI.createWidget(hmUI.widget.TEXT, {
      x: 145,
      y: 297,
      w: 70,
      h: 30,
      text_size: 22,
      color: 0x8a90a6,
      align_h: hmUI.align.LEFT,
      align_v: hmUI.align.CENTER_V,
      font: 'fonts/Outfit-ExtraBold.ttf',
      text: ''
    })
    
    // Shortcut Touch Area for BATTERY
    hmUI.createWidget(hmUI.widget.IMG_CLICK, {
      x: 115,
      y: 301,
      w: 100,
      h: 30,
      src: 'transparent.png',
      type: hmUI.data_type.BATTERY
    })
      
      
    // Weekday Widget (Centered)
    this.weekdayTextWidget = hmUI.createWidget(hmUI.widget.TEXT, {
      x: 115,
      y: 326,
      w: 100,
      h: 25,
      text_size: 16,
      color: 0x8a90a6,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
      font: 'fonts/Outfit-ExtraBold.ttf',
      text: ''
    })
    
      
    // Steps Complication
    
    
    this.stepsBar1 = hmUI.createWidget(hmUI.widget.FILL_RECT, { x: 239, y: 315, w: Math.round(5 * scale), h: Math.round(4 * scale), color: 0x000000 })
    this.stepsBar2 = hmUI.createWidget(hmUI.widget.FILL_RECT, { x: 246, y: 310, w: Math.round(5 * scale), h: Math.round(9 * scale), color: 0x000000 })
    this.stepsBar3 = hmUI.createWidget(hmUI.widget.FILL_RECT, { x: 253, y: 305, w: Math.round(5 * scale), h: Math.round(14 * scale), color: 0x000000 })
        
    this.stepsTextWidget = hmUI.createWidget(hmUI.widget.TEXT, {
      x: 269,
      y: 297,
      w: 74,
      h: 30,
      text_size: 22,
      color: 0x000000,
      align_h: hmUI.align.LEFT,
      align_v: hmUI.align.CENTER_V,
      font: 'fonts/Outfit-ExtraBold.ttf',
      text: ''
    })
    
    // Shortcut Touch Area for STEP
    hmUI.createWidget(hmUI.widget.IMG_CLICK, {
      x: 239,
      y: 301,
      w: 100,
      h: 30,
      src: 'transparent.png',
      type: hmUI.data_type.STEP
    })
      
      
    // Date Widget (Centered)
    this.monthDayTextWidget = hmUI.createWidget(hmUI.widget.TEXT, {
      x: 239,
      y: 326,
      w: 100,
      h: 25,
      text_size: 16,
      color: 0x8a90a6,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
      font: 'fonts/Outfit-ExtraBold.ttf',
      text: ''
    })
    
      
    this.applyThemeColors()
    this.updateTime()
        this.updateBattery()
        this.updateSteps()

    this.setupListeners()
  },

  setupListeners() {
    const updateTimeCb = () => this.updateTime()
    const updateBatteryCb = () => this.updateBattery()
    const updateStepsCb = () => this.updateSteps()

    // Register sensor change listeners
    this.batterySensor.addEventListener(hmSensor.event.CHANGE, updateBatteryCb)
    this.stepSensor.addEventListener(hmSensor.event.CHANGE, updateStepsCb)

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
    const theme = THEMES[this.currentThemeIndex]
    
    if (this.hourTextWidget) this.hourTextWidget.setProperty(hmUI.prop.COLOR, theme.line)
    if (this.minuteTextWidget) this.minuteTextWidget.setProperty(hmUI.prop.COLOR, theme.minute)
    if (this.centerLineWidget) {
      this.centerLineWidget.setProperty(hmUI.prop.MORE, {
        color: theme.line
      })
    }
    if (this.batteryTextWidget) this.batteryTextWidget.setProperty(hmUI.prop.COLOR, 0x8a90a6)
    if (this.weekdayTextWidget) this.weekdayTextWidget.setProperty(hmUI.prop.COLOR, 0x8a90a6)
    if (this.stepsTextWidget) {
      this.stepsTextWidget.setProperty(hmUI.prop.COLOR, theme.steps)
      this.stepsBar1.setProperty(hmUI.prop.COLOR, theme.line)
      this.stepsBar2.setProperty(hmUI.prop.COLOR, theme.line)
      this.stepsBar3.setProperty(hmUI.prop.COLOR, theme.line)
    }
    if (this.monthDayTextWidget) this.monthDayTextWidget.setProperty(hmUI.prop.COLOR, 0x8a90a6)

    this.updateBattery()
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

    const WEEK_DAYS = ['', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
    const MONTH_NAMES = ['', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

    const day = this.timeSensor.day
    const monthIndex = this.timeSensor.month
    const weekIndex = this.timeSensor.week

    const monthStr = MONTH_NAMES[monthIndex] || ''
    const weekStr = WEEK_DAYS[weekIndex] || ''

    if (this.weekdayTextWidget) {
      this.weekdayTextWidget.setProperty(hmUI.prop.TEXT, weekStr)
    }
    if (this.monthDayTextWidget) {
      this.monthDayTextWidget.setProperty(hmUI.prop.TEXT, `${monthStr} ${day}`)
    }
  },

  updateBattery() {
    if (!this.batteryTextWidget) return
    const batteryVal = this.batterySensor.current
    this.batteryTextWidget.setProperty(hmUI.prop.TEXT, `${batteryVal}%`)

    // Update battery fill color and width
    const w_charge = Math.round(18 * (batteryVal / 100))
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
    if (!this.stepsTextWidget) return
    const stepsVal = this.stepSensor.current
    const formattedSteps = stepsVal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
    this.stepsTextWidget.setProperty(hmUI.prop.TEXT, formattedSteps)
    
  },
  onDestroy() {
    console.log('index page.js on destroy invoke')
    if (this.timeTimer) {
      timer.stopTimer(this.timeTimer)
      this.timeTimer = null
    }
  }
})