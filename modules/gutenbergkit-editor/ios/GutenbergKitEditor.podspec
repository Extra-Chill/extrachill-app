Pod::Spec.new do |s|
  s.name           = 'GutenbergKitEditor'
  s.version        = '0.1.0'
  s.summary        = 'Expo bridge for GutenbergKit'
  s.description    = 'A focused offline editor bridge for GutenbergKit.'
  s.license        = { :type => 'GPL-2.0-or-later' }
  s.author         = 'Extra Chill'
  s.homepage       = 'https://github.com/Extra-Chill/extrachill-app'
  s.platforms      = { :ios => '17.0' }
  s.source         = { :git => 'https://github.com/Extra-Chill/extrachill-app.git' }
  s.static_framework = true
  s.swift_version  = '5.9'
  s.source_files   = '**/*.{h,m,mm,swift}'

  s.dependency 'ExpoModulesCore'

  spm_dependency(
    s,
    url: 'https://github.com/wordpress-mobile/GutenbergKit.git',
    requirement: { kind: 'exactVersion', version: '0.19.0' },
    products: ['GutenbergKit']
  )
end
