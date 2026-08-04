import java.io.FileInputStream
import java.util.Properties

plugins {
    id("com.android.application")
}

val keystoreProperties = Properties().apply {
    val f = rootProject.file("keystore.properties")
    if (f.exists()) load(FileInputStream(f))
}

fun secret(name: String, fallback: String = ""): String {
    val fromFile = keystoreProperties.getProperty(name)
    if (!fromFile.isNullOrBlank()) return fromFile
    return System.getenv(name) ?: fallback
}

android {
    namespace = "com.alex.admin"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.alex.admin"
        minSdk = 24
        targetSdk = 34
        versionCode = 7
        versionName = "1.0.6"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            isShrinkResources = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            signingConfig = signingConfigs.getByName("release")
        }
        debug {
            signingConfig = signingConfigs.getByName("release")
        }
    }

    signingConfigs {
        create("release") {
            storeFile = file(secret("STORE_FILE"))
            storePassword = secret("STORE_PASSWORD")
            keyAlias = secret("KEY_ALIAS")
            keyPassword = secret("KEY_PASSWORD")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }
}
