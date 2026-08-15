allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

val newBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)

    // Certains plugins (ex: file_picker, via flutter_plugin_android_lifecycle)
    // compilent encore contre l'ancien compileSdk par défaut de Flutter (34),
    // ce qui échoue depuis que ce projet dépend de firebase_messaging (exige
    // compileSdk >= 36). On force compileSdk sur tous les sous-modules, pas
    // seulement :app. Doit être enregistré avant evaluationDependsOn ci-dessous,
    // qui force l'évaluation immédiate de :app.
    afterEvaluate {
        extensions.findByName("android")?.let { ext ->
            val android = ext as com.android.build.gradle.BaseExtension
            if (android.compileSdkVersion != "android-36") {
                android.compileSdkVersion(36)
            }
        }
    }
}
subprojects {
    project.evaluationDependsOn(":app")
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
