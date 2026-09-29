$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$javaHome = "C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot"
$tomcatHome = Join-Path $root "tools\apache-tomcat-11.0.26"

if (-not (Test-Path $javaHome)) {
  throw "JDK not found at $javaHome"
}
if (-not (Test-Path $tomcatHome)) {
  throw "Tomcat not found at $tomcatHome"
}

$env:JAVA_HOME = $javaHome
$env:CATALINA_HOME = $tomcatHome
$env:Path = "$javaHome\bin;$env:Path"

Write-Host "Starting Tomcat at $tomcatHome"
& "$tomcatHome\bin\startup.bat"
Write-Host "Tomcat started. Frontend (after deploy): http://localhost:8080/vibecoding/"
