$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$frontend = Join-Path $root "frontend"
$tomcatHome = Join-Path $root "tools\apache-tomcat-11.0.26"
$webapp = Join-Path $tomcatHome "webapps\vibecoding"

Set-Location $frontend
npm run build

if (Test-Path $webapp) {
  Remove-Item -Recurse -Force $webapp
}
New-Item -ItemType Directory -Force -Path $webapp | Out-Null
Copy-Item -Recurse -Force (Join-Path $frontend "dist\*") $webapp

$webInf = Join-Path $webapp "WEB-INF"
New-Item -ItemType Directory -Force -Path $webInf | Out-Null
@"
<?xml version="1.0" encoding="UTF-8"?>
<web-app xmlns="https://jakarta.ee/xml/ns/jakartaee"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="https://jakarta.ee/xml/ns/jakartaee https://jakarta.ee/xml/ns/jakartaee/web-app_6_0.xsd"
         version="6.0">
  <error-page>
    <error-code>404</error-code>
    <location>/index.html</location>
  </error-page>
</web-app>
"@ | Set-Content -Path (Join-Path $webInf "web.xml") -Encoding UTF8

Write-Host "Deployed to $webapp"
Write-Host "Open http://localhost:8080/vibecoding/ (Tomcat must be running)"
