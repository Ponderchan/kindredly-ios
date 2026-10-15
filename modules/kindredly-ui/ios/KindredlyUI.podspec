# Kindredly's SwiftUI views (the 10a overhaul, iOS 1.3.0), found by Expo autolinking in
# ./modules and linked by `use_expo_modules!` at pod install.
#
# The platform must not be above the app's own deployment target (app.json ios.deploymentTarget):
# a pod that asks for more than the app is skipped by autolinking with only a warning.
# Swift 5.9 as ExpoUI and ExpoWidgets use, which keeps Swift 6's strict concurrency checks off.
Pod::Spec.new do |s|
  s.name           = 'KindredlyUI'
  s.version        = '1.0.0'
  s.summary        = 'Kindredly SwiftUI views'
  s.description    = 'Kindredly SwiftUI views rendered from React Native through @expo/ui'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = { :ios => '18.0' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.dependency 'ExpoUI'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES'
  }

  # Portable/ and Adapters/ are picked up too
  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
