const { withAppBuildGradle, withGradleProperties } = require('@expo/config-plugins');

const MARKER = '/* @generated windows-long-paths */';
const CMAKE_STAGING_DIR = 'C:/rn-cmake';

const WINDOWS_ANDROID_CMAKE_BLOCK = `
    ${MARKER}
    externalNativeBuild {
        cmake {
            buildStagingDirectory = file("${CMAKE_STAGING_DIR}")
        }
    }`;

const WINDOWS_LONG_PATHS_BLOCK = `
        ${MARKER}
        externalNativeBuild {
            cmake {
                def windowsNinja = new File(projectRoot, "tools/ninja/ninja.exe")
                if (windowsNinja.exists()) {
                    arguments "-DCMAKE_MAKE_PROGRAM=" + windowsNinja.getAbsolutePath().replace('\\\\', '/')
                }
                arguments "-DCMAKE_OBJECT_PATH_MAX=1024"
            }
        }`;

function setGradleProperty(properties, key, value) {
  const existing = properties.find((entry) => entry.type === 'property' && entry.key === key);
  if (existing) {
    existing.value = value;
    return;
  }

  properties.push({ type: 'property', key, value });
}

/**
 * Work around Windows MAX_PATH failures in RN New Architecture CMake builds.
 * Requires tools/ninja/ninja.exe (see scripts/setup-android-windows-build.ps1).
 * Also enable Windows long paths (LongPathsEnabled=1) or use a shorter project path.
 */
function withAndroidWindowsLongPaths(config) {
  config = withGradleProperties(config, (config) => {
    setGradleProperty(config.modResults, 'org.gradle.parallel', 'false');
    return config;
  });

  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    if (!contents.includes('buildStagingDirectory')) {
      const withStaging = contents.replace(
        /(android\s*\{[\s\S]*?compileSdk[^\n]*\n)/,
        `$1${WINDOWS_ANDROID_CMAKE_BLOCK}\n`,
      );

      if (withStaging === contents) {
        throw new Error(
          'with-android-windows-long-paths: could not inject CMake staging dir into android/app/build.gradle',
        );
      }

      contents = withStaging;
    }

    if (!contents.includes('CMAKE_OBJECT_PATH_MAX')) {
      const withCmakeArgs = contents.replace(
        /(defaultConfig\s*\{[\s\S]*?)(    \}\s*\n\s*signingConfigs\s*\{)/,
        `$1${WINDOWS_LONG_PATHS_BLOCK}\n$2`,
      );

      if (withCmakeArgs === contents) {
        throw new Error(
          'with-android-windows-long-paths: could not inject CMake args into android/app/build.gradle',
        );
      }

      contents = withCmakeArgs;
    }

    config.modResults.contents = contents;
    return config;
  });
}

module.exports = withAndroidWindowsLongPaths;
