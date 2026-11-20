export type Lang = 'bn' | 'en';
export type LabModule = 'mod1' | 'mod2' | 'mod3';

export interface Translations {
  appTitle: string;
  appShortTitle: string;
  reset: string;
  langToggle: string;
  tabs: {
    mod1: string;
    mod1Short: string;
    mod2: string;
    mod2Short: string;
    mod3: string;
    mod3Short: string;
  };
  common: {
    controlsTitle: string;
    telemetryTitle: string;
    play: string;
    pause: string;
    speed: string;
    formulaCard: string;
    dragHint: string;
  };
  mod1: {
    subtitle: string;
    initialTemps: string;
    sysA: string;
    sysB: string;
    sysC: string;
    sysCLabel: string;
    wallControls: string;
    wallAC: string;
    wallBC: string;
    adiabatic: string;
    diathermal: string;
    adiabaticDesc: string;
    diathermalDesc: string;
    autoDemo: string;
    autoDemoRunning: string;
    testContact: string;
    exitContact: string;
    directContactTitle: string;
    equilibriumAchieved: string;
    zeroNetHeat: string;
    activeHeatFlow: string;
    heatFluxTitle: string;
    fluxAC: string;
    fluxBC: string;
    fluxAB: string;
    directionNone: string;
    zerothLawTitle: string;
    zerothLawStatement: string;
    conditionAC: string;
    conditionBC: string;
    conclusionAB: string;
    met: string;
    pending: string;
    clickWallTip: string;
    demoStep1: string;
    demoStep2: string;
    demoStep3: string;
    tempHistory: string;
    chamberModeNormal: string;
    chamberModeDirect: string;
  };
  mod2: {
    subtitle: string;
    bathTemp: string;
    customScaleTitle: string;
    customIce: string;
    customSteam: string;
    presetsTitle: string;
    presetAbsZero: string;
    presetCFMatch: string;
    presetIce: string;
    presetSteam: string;
    presetFKMatch: string;
    scaleCelsius: string;
    scaleFahrenheit: string;
    scaleKelvin: string;
    scaleCustom: string;
    icePoint: string;
    steamPoint: string;
    divisions: string;
    proportionTitle: string;
    identicalRatio: string;
    linearPrincipleTitle: string;
    dragCanvasHint: string;
    coincidenceBannerCF: string;
    coincidenceBannerFK: string;
    absZeroBanner: string;
    scaleTableTitle: string;
    scaleCol: string;
    readingCol: string;
    intervalCol: string;
  };
  mod3: {
    subtitle: string;
    faultySectionTitle: string;
    faultyIce: string;
    faultySteam: string;
    faultyReading: string;
    jumpToCoincidence: string;
    noCoincidence: string;
    alreadyCalibrated: string;
    triplePointSectionTitle: string;
    sensorMode: string;
    gasThermometer: string;
    platinumThermometer: string;
    refPressure: string;
    measuredPressure: string;
    refResistance: string;
    measuredResistance: string;
    standardLabel: string;
    faultyLabel: string;
    calibrationGraphTitle: string;
    identityLine: string;
    calibrationLine: string;
    coincidencePoint: string;
    currentPoint: string;
    trueTempTitle: string;
    errorLabel: string;
    fundamentalInterval: string;
    coincidenceTemp: string;
    tripleCellTitle: string;
    tripleCellNote: string;
    icePhase: string;
    waterPhase: string;
    vaporPhase: string;
    gasBulbLabel: string;
    manometerLabel: string;
    platinumCoilLabel: string;
    singlePointTitle: string;
    kelvinOutput: string;
    celsiusOutput: string;
    ratioLabel: string;
    dragThermometerHint: string;
  };
}

export const TRANSLATIONS: Record<Lang, Translations> = {
  bn: {
    appTitle: 'তাপীয় সমতা, শূন্যতম সূত্র ও থার্মোমিটার ক্যালিব্রেশন ল্যাব',
    appShortTitle: 'থার্মোমেট্রি ও তাপীয় সমতা ল্যাব',
    reset: 'রিসেট',
    langToggle: 'English',
    tabs: {
      mod1: 'মডিউল ১: তাপীয় সমতা ও শূন্যতম সূত্র',
      mod1Short: '১. তাপীয় সমতা ও শূন্যতম সূত্র',
      mod2: 'মডিউল ২: দুই স্থির বিন্দু ও স্কেলসমূহ',
      mod2Short: '২. দুই স্থির বিন্দু ও স্কেল',
      mod3: 'মডিউল ৩: ত্রুটিপূর্ণ থার্মোমিটার ও ত্রৈধ বিন্দু',
      mod3Short: '৩. ত্রুটিপূর্ণ ও ত্রৈধ বিন্দু',
    },
    common: {
      controlsTitle: 'নিয়ন্ত্রণ প্যানেল',
      telemetryTitle: 'লাইভ পরিমাপ ও সূত্র',
      play: 'চালু করুন',
      pause: 'বিরতি',
      speed: 'গতি',
      formulaCard: 'গাণিতিক সম্পর্ক',
      dragHint: 'সরাসরি টেনে পরিবর্তন করুন',
    },
    mod1: {
      subtitle: 'তাপীয় সমতা ও তাপগতিবিদ্যার শূন্যতম সূত্র পর্যবেক্ষণ',
      initialTemps: 'প্রাথমিক তাপমাত্রা নির্ধারণ',
      sysA: 'সিস্টেম A (বাম প্রকোষ্ঠ)',
      sysB: 'সিস্টেম B (ডান প্রকোষ্ঠ)',
      sysC: 'সিস্টেম C (প্রমাণ থার্মোমিটার ব্লক)',
      sysCLabel: 'সিস্টেম C (রেফারেন্স)',
      wallControls: 'তাপীয় দেয়াল নিয়ন্ত্রণ',
      wallAC: 'দেয়াল ১ (A — C)',
      wallBC: 'দেয়াল ২ (B — C)',
      adiabatic: 'তাপ অন্তরক',
      diathermal: 'তাপ সুপরিবাহী',
      adiabaticDesc: 'তাপ আদান-প্রদান বন্ধ',
      diathermalDesc: 'সক্রিয় তাপ পরিবহন',
      autoDemo: 'ধাপে ধাপে শূন্যতম সূত্র প্রমাণ (A ও B ↔ C)',
      autoDemoRunning: 'স্বয়ংক্রিয় প্রমাণ চলছে...',
      testContact: 'সরাসরি সংস্পর্শ পরীক্ষা (A ↔ B)',
      exitContact: '৩-প্রকোষ্ঠ দৃশ্যে ফিরুন',
      directContactTitle: 'সিস্টেম A ও B এর সরাসরি তাপীয় সংস্পর্শ',
      equilibriumAchieved: 'তাপীয় সমতা অর্জিত',
      zeroNetHeat: 'নিট তাপ প্রবাহ শূন্য (Q̇_AB = 0)',
      activeHeatFlow: 'সক্রিয় তাপ প্রবাহ চলছে',
      heatFluxTitle: 'তাৎক্ষণিক তাপ প্রবাহের হার (Q̇)',
      fluxAC: 'প্রবাহ A ↔ C',
      fluxBC: 'প্রবাহ B ↔ C',
      fluxAB: 'প্রবাহ A ↔ B',
      directionNone: 'শূন্য প্রবাহ (সমতা)',
      zerothLawTitle: 'তাপগতিবিদ্যার শূন্যতম সূত্র যাচাই',
      zerothLawStatement: 'যদি A এবং B পৃথকভাবে C-এর সাথে তাপীয় সমতায় থাকে, তবে A এবং B পরস্পর তাপীয় সমতায় থাকবে।',
      conditionAC: 'T_A = T_C (A ও C সমতায়)',
      conditionBC: 'T_B = T_C (B ও C সমতায়)',
      conclusionAB: 'T_A = T_B (সুতরাং A ও B সমতায়)',
      met: 'অর্জিত',
      pending: 'অপেক্ষমাণ',
      clickWallTip: 'পরামর্শ: ক্যানভাসের দেয়ালে ক্লিক করেও অন্তরক/সুপরিবাহী পরিবর্তন করা যাবে।',
      demoStep1: 'ধাপ ১/৩: A এবং C তাপীয় সমতায় আসছে...',
      demoStep2: 'ধাপ ২/৩: B এবং C তাপীয় সমতায় আসছে...',
      demoStep3: 'ধাপ ৩/৩: A ও B সরাসরি সংস্পর্শে — তাপীয় সমতা প্রমাণিত!',
      tempHistory: 'সময়ের সাথে তাপমাত্রার পরিবর্তন',
      chamberModeNormal: '৩-প্রকোষ্ঠ তাপীয় যন্ত্র',
      chamberModeDirect: 'সরাসরি A ↔ B সংস্পর্শ পরীক্ষা',
    },
    mod2: {
      subtitle: 'দুই স্থির বিন্দু পদ্ধতি ও চারটি তাপমাত্রা স্কেলের তুলনামূলক বিশ্লেষণ',
      bathTemp: 'তাপীয় স্নানাগারের তাপমাত্রা',
      customScaleTitle: 'কাস্টম স্কেল (°X) ক্যালিব্রেশন',
      customIce: 'নিম্ন স্থির বিন্দু (X_ice)',
      customSteam: 'ঊর্ধ্ব স্থির বিন্দু (X_steam)',
      presetsTitle: 'গুরুত্বপূর্ণ আদর্শ বিন্দু (এক ক্লিকে)',
      presetAbsZero: 'পরম শূন্য (0 K = -273.15°C)',
      presetCFMatch: 'সেলসিয়াস = ফারেনহাইট (-40°C = -40°F)',
      presetIce: 'বরফ বিন্দু (0°C = 32°F = 273.15 K)',
      presetSteam: 'স্টিম বিন্দু (100°C = 212°F = 373.15 K)',
      presetFKMatch: 'ফারেনহাইট = কেলভিন (574.25°F = 574.25 K)',
      scaleCelsius: 'সেলসিয়াস',
      scaleFahrenheit: 'ফারেনহাইট',
      scaleKelvin: 'কেলভিন',
      scaleCustom: 'কাস্টম স্কেল X',
      icePoint: 'বরফ বিন্দু (নিম্ন স্থির)',
      steamPoint: 'স্টিম বিন্দু (ঊর্ধ্ব স্থির)',
      divisions: 'মৌলিক ব্যবধান',
      proportionTitle: 'লাইভ অনুপাত যাচাইকারী',
      identicalRatio: 'প্রতিটি স্কেলে অভিন্ন ভগ্নাংশ অনুপাত',
      linearPrincipleTitle: 'রৈখিক উষ্ণতামিতিক ধর্ম',
      dragCanvasHint: 'ক্যানভাসের অনুভূমিক কার্সর রেখা টেনে তাপমাত্রা পরিবর্তন করুন',
      coincidenceBannerCF: 'বিশেষ বিন্দু: সেলসিয়াস ও ফারেনহাইট স্কেল সমান (-40°)',
      coincidenceBannerFK: 'বিশেষ বিন্দু: ফারেনহাইট ও কেলভিন স্কেল সমান (574.25)',
      absZeroBanner: 'পরম শূন্য তাপমাত্রা: অণুর তাপীয় গতি সর্বনিম্ন (0 K)',
      scaleTableTitle: 'স্কেল তুলনামূলক সারণি',
      scaleCol: 'স্কেল',
      readingCol: 'পাঠ',
      intervalCol: 'ভাগ',
    },
    mod3: {
      subtitle: 'ত্রুটিপূর্ণ থার্মোমিটার সংশোধন ও পানির ত্রৈধ বিন্দু (এক স্থির বিন্দু) পদ্ধতি',
      faultySectionTitle: '১. ত্রুটিপূর্ণ থার্মোমিটার ক্যালিব্রেশন',
      faultyIce: 'ত্রুটিপূর্ণ বরফ বিন্দু (X_ice)',
      faultySteam: 'ত্রুটিপূর্ণ স্টিম বিন্দু (X_steam)',
      faultyReading: 'ত্রুটিপূর্ণ থার্মোমিটারের পাঠ (X)',
      jumpToCoincidence: 'সঠিক পাঠ বিন্দুতে যান (X = C_true)',
      noCoincidence: 'সমান্তরাল রেখা — কোনো ছেদবিন্দু নেই',
      alreadyCalibrated: 'থার্মোমিটারটি সম্পূর্ণ ত্রুটিমুক্ত (X = C)',
      triplePointSectionTitle: '২. এক স্থির বিন্দু পদ্ধতি (ত্রৈধ বিন্দু)',
      sensorMode: 'উষ্ণতামিতিক ধর্ম নির্বাচন',
      gasThermometer: 'স্থির আয়তন গ্যাস (চাপ P)',
      platinumThermometer: 'প্লাটিনাম রোধ (রোধ R)',
      refPressure: 'ত্রৈধ বিন্দুতে চাপ (P_tr)',
      measuredPressure: 'পরিমাপকৃত চাপ (P)',
      refResistance: 'ত্রৈধ বিন্দুতে রোধ (R_tr)',
      measuredResistance: 'পরিমাপকৃত রোধ (R)',
      standardLabel: 'প্রমাণ (°C)',
      faultyLabel: 'ত্রুটিপূর্ণ (°X)',
      calibrationGraphTitle: 'ক্যালিব্রেশন লেখচিত্র (C_true বনাম X)',
      identityLine: 'অভেদ রেখা (C = X)',
      calibrationLine: 'প্রকৃত রেখা C(X)',
      coincidencePoint: 'সঠিক পাঠ (X = C)',
      currentPoint: 'বর্তমান পাঠ',
      trueTempTitle: 'ত্রুটিপূর্ণ থার্মোমিটার বিশ্লেষণ',
      errorLabel: 'পাঠের ত্রুটি (X − C_true)',
      fundamentalInterval: 'ত্রুটিপূর্ণ মৌলিক ব্যবধান',
      coincidenceTemp: 'যে তাপমাত্রায় সঠিক পাঠ দেয়',
      tripleCellTitle: 'পানির ত্রৈধ বিন্দু কোষ',
      tripleCellNote: 'T_tr = 273.16 K (0.01°C, 4.58 mmHg)',
      icePhase: 'বরফ',
      waterPhase: 'তরল পানি',
      vaporPhase: 'জলীয় বাষ্প',
      gasBulbLabel: 'স্থির আয়তন গ্যাস বাল্ব',
      manometerLabel: 'পারদ ম্যানোমিটার',
      platinumCoilLabel: 'প্লাটিনাম কুণ্ডলী',
      singlePointTitle: 'এক স্থির বিন্দু তাপমাত্রা গণনা',
      kelvinOutput: 'পরম তাপমাত্রা (T)',
      celsiusOutput: 'সেলসিয়াস মান (θ)',
      ratioLabel: 'অনুপাত',
      dragThermometerHint: 'বাম দিকের থার্মোমিটার টেনে পাঠ পরিবর্তন করুন',
    },
  },
  en: {
    appTitle: 'Thermal Equilibrium, Zeroth Law & Thermometry Studio',
    appShortTitle: 'Thermometry Calibration Studio',
    reset: 'Reset',
    langToggle: 'বাংলা',
    tabs: {
      mod1: 'Module 1: Thermal Equilibrium & Zeroth Law',
      mod1Short: '1. Equilibrium & Zeroth Law',
      mod2: 'Module 2: Two Fixed Points & Scales',
      mod2Short: '2. Fixed Points & Scales',
      mod3: 'Module 3: Faulty Thermometer & Triple Point',
      mod3Short: '3. Faulty & Triple Point',
    },
    common: {
      controlsTitle: 'Control Console',
      telemetryTitle: 'Live Telemetry & Formulas',
      play: 'Play',
      pause: 'Pause',
      speed: 'Speed',
      formulaCard: 'Live Formula Substitution',
      dragHint: 'Drag directly on canvas',
    },
    mod1: {
      subtitle: 'Heat flow, thermal equilibrium & the Zeroth Law of Thermodynamics',
      initialTemps: 'Initial Chamber Temperatures',
      sysA: 'System A (Left Chamber)',
      sysB: 'System B (Right Chamber)',
      sysC: 'System C (Reference Block)',
      sysCLabel: 'System C (Reference)',
      wallControls: 'Thermal Partition Walls',
      wallAC: 'Wall 1 (A — C)',
      wallBC: 'Wall 2 (B — C)',
      adiabatic: 'Adiabatic Insulator',
      diathermal: 'Diathermal Conductor',
      adiabaticDesc: 'Zero heat exchange',
      diathermalDesc: 'Active heat conduction',
      autoDemo: 'Equalize A & B with C Step-by-Step',
      autoDemoRunning: 'Running Step-by-Step Proof...',
      testContact: 'Test Direct Contact (A ↔ B)',
      exitContact: 'Return to 3-Chamber View',
      directContactTitle: 'Direct Thermal Contact: System A ↔ System B',
      equilibriumAchieved: 'Thermal Equilibrium Achieved',
      zeroNetHeat: 'Zero Net Heat Flow (Q̇_AB = 0)',
      activeHeatFlow: 'Active Heat Transfer in Progress',
      heatFluxTitle: 'Instantaneous Heat Flux (Q̇)',
      fluxAC: 'Flux A ↔ C',
      fluxBC: 'Flux B ↔ C',
      fluxAB: 'Flux A ↔ B',
      directionNone: 'Zero Flux (Balanced)',
      zerothLawTitle: 'Zeroth Law Verification',
      zerothLawStatement: 'If System A and System B are each in thermal equilibrium with System C, then A and B are in thermal equilibrium with each other.',
      conditionAC: 'T_A = T_C (A & C in equilibrium)',
      conditionBC: 'T_B = T_C (B & C in equilibrium)',
      conclusionAB: 'T_A = T_B (Thus A & B in equilibrium)',
      met: 'Verified',
      pending: 'Pending',
      clickWallTip: 'Tip: Click directly on Wall 1 or Wall 2 inside the canvas to toggle insulation.',
      demoStep1: 'Step 1/3: Equilibrating System A with Reference C...',
      demoStep2: 'Step 2/3: Equilibrating System B with Reference C...',
      demoStep3: 'Step 3/3: Direct A ↔ B contact — Zero net heat flow proven!',
      tempHistory: 'Real-Time Temperature Convergence',
      chamberModeNormal: '3-Chamber Thermal Apparatus',
      chamberModeDirect: 'Direct Contact Test (A ↔ B)',
    },
    mod2: {
      subtitle: 'Two fixed-point calibration across Celsius, Fahrenheit, Kelvin & Custom X',
      bathTemp: 'Thermal Bath Temperature',
      customScaleTitle: 'Custom Scale (°X) Fixed Points',
      customIce: 'Lower Fixed Point (X_ice)',
      customSteam: 'Upper Fixed Point (X_steam)',
      presetsTitle: 'Landmark Temperature Presets',
      presetAbsZero: 'Absolute Zero (0 K = -273.15°C)',
      presetCFMatch: 'Celsius = Fahrenheit (-40°C = -40°F)',
      presetIce: 'Ice Point (0°C = 32°F = 273.15 K)',
      presetSteam: 'Steam Point (100°C = 212°F = 373.15 K)',
      presetFKMatch: 'Fahrenheit = Kelvin (574.25°F = 574.25 K)',
      scaleCelsius: 'Celsius',
      scaleFahrenheit: 'Fahrenheit',
      scaleKelvin: 'Kelvin',
      scaleCustom: 'Custom Scale X',
      icePoint: 'Ice Point (Lower Fixed)',
      steamPoint: 'Steam Point (Upper Fixed)',
      divisions: 'Divisions',
      proportionTitle: 'Live Proportion Verifier',
      identicalRatio: 'Identical Fractional Ratio Across All Scales',
      linearPrincipleTitle: 'Linear Thermometric Property',
      dragCanvasHint: 'Drag the horizontal cursor line on canvas to sweep temperature',
      coincidenceBannerCF: 'Exact Coincidence: Celsius equals Fahrenheit at -40°',
      coincidenceBannerFK: 'Exact Coincidence: Fahrenheit equals Kelvin at 574.25',
      absZeroBanner: 'Absolute Zero: Minimum molecular thermal energy (0 K)',
      scaleTableTitle: 'Multi-Scale Comparison Table',
      scaleCol: 'Scale',
      readingCol: 'Reading',
      intervalCol: 'Div',
    },
    mod3: {
      subtitle: 'Faulty thermometer correction & Modern Triple-Point (Single Fixed-Point) method',
      faultySectionTitle: '1. Faulty Thermometer Calibration',
      faultyIce: 'Faulty Ice Point (X_ice)',
      faultySteam: 'Faulty Steam Point (X_steam)',
      faultyReading: 'Faulty Reading (X)',
      jumpToCoincidence: 'Jump to Exact Match (X = C_true)',
      noCoincidence: 'Parallel lines — No finite match point',
      alreadyCalibrated: 'Thermometer is perfectly calibrated (X = C)',
      triplePointSectionTitle: '2. Single Fixed-Point (Triple Point)',
      sensorMode: 'Thermometric Property',
      gasThermometer: 'Constant-Volume Gas (P)',
      platinumThermometer: 'Platinum Resistance (R)',
      refPressure: 'Triple-Point Pressure (P_tr)',
      measuredPressure: 'Measured Pressure (P)',
      refResistance: 'Triple-Point Resistance (R_tr)',
      measuredResistance: 'Measured Resistance (R)',
      standardLabel: 'Standard (°C)',
      faultyLabel: 'Faulty (°X)',
      calibrationGraphTitle: 'Calibration Plot (C_true vs X)',
      identityLine: 'Identity Line (C = X)',
      calibrationLine: 'True Line C(X)',
      coincidencePoint: 'Exact Match (X = C)',
      currentPoint: 'Current Point',
      trueTempTitle: 'Faulty Thermometer Telemetry',
      errorLabel: 'Reading Error (X − C_true)',
      fundamentalInterval: 'Faulty Fundamental Interval',
      coincidenceTemp: 'Unique Correct-Reading Temp',
      tripleCellTitle: 'Triple Point of Water Cell',
      tripleCellNote: 'T_tr = 273.16 K (0.01°C, 4.58 mmHg)',
      icePhase: 'Ice',
      waterPhase: 'Liquid Water',
      vaporPhase: 'Water Vapor',
      gasBulbLabel: 'Constant-Volume Gas Bulb',
      manometerLabel: 'Mercury Manometer',
      platinumCoilLabel: 'Platinum Coil',
      singlePointTitle: 'Single Fixed-Point Calculation',
      kelvinOutput: 'Absolute Temperature (T)',
      celsiusOutput: 'Celsius Equivalent (θ)',
      ratioLabel: 'Ratio',
      dragThermometerHint: 'Drag the mercury column on the left to test readings',
    },
  },
};
