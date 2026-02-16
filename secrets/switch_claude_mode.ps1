param (
    [Parameter(Mandatory = $true)]
    [ValidateSet("pro", "zai")]
    [string]$mode
)

# Configuration for Z AI Mode (EDIT THESE VALUES)
$ZAI_Settings = @{
    "anthropicApiBaseUrl" = "https://api.z.ai/api/anthropic";
    "primaryModel"        = "glm-4.7";
    "env"                 = @{
        # Get from environment variable or fill in manually
        "ANTHROPIC_AUTH_TOKEN"           = if ($env:ANTHROPIC_AUTH_TOKEN) { $env:ANTHROPIC_AUTH_TOKEN } else { "YOUR_TOKEN_HERE" };
        "ANTHROPIC_BASE_URL"             = "https://api.z.ai/api/anthropic";
        "ANTHROPIC_DEFAULT_HAIKU_MODEL"  = "glm-4.7-flashX";
        "ANTHROPIC_DEFAULT_SONNET_MODEL" = "glm-5";
        "ANTHROPIC_DEFAULT_OPUS_MODEL"   = "glm-5"
    }
}

$SettingsPath = "$PSScriptRoot\..\.claude\settings.local.json"
$ResolvedPath = Resolve-Path $SettingsPath
Write-Host "Reading settings from: $ResolvedPath"

if (-not (Test-Path $ResolvedPath)) {
    Write-Error "Settings file not found at $ResolvedPath"
    exit 1
}

# Read existing JSON
$jsonContent = Get-Content -Path $ResolvedPath -Raw
$settings = $jsonContent | ConvertFrom-Json

# Handle Mode Switch
if ($mode -eq "zai") {
    Write-Host "Switching to Z AI API Mode..."
    
    # 1. Update JSON Settings
    foreach ($key in $ZAI_Settings.Keys) {
        if ($key -eq "env") { continue } # Skip env loop here, handle later if needed in JSON
        $settings | Add-Member -MemberType NoteProperty -Name $key -Value $ZAI_Settings[$key] -Force
        Write-Host "  + JSON: Set $key"
    }
    
    # Enable env in JSON too (optional but good for syncing)
    $settings | Add-Member -MemberType NoteProperty -Name "env" -Value $ZAI_Settings["env"] -Force
    Write-Host "  + JSON: Set env block"

    # 2. Set System Environment Variables (User Scope)
    foreach ($envKey in $ZAI_Settings.env.Keys) {
        $envValue = $ZAI_Settings.env[$envKey]
        [System.Environment]::SetEnvironmentVariable($envKey, $envValue, 'User')
        Write-Host "  + ENV: Set $envKey (User Scope)"
    }
}
elseif ($mode -eq "pro") {
    Write-Host "Switching to Pro/Max Plan (Default) Mode..."
    
    # 1. Remove from JSON
    foreach ($key in $ZAI_Settings.Keys) {
        if ($settings.PSObject.Properties[$key]) {
            $settings.PSObject.Properties.Remove($key)
            Write-Host "  - JSON: Removed $key"
        }
    }

    # 2. Unset System Environment Variables (User Scope)
    foreach ($envKey in $ZAI_Settings.env.Keys) {
        [System.Environment]::SetEnvironmentVariable($envKey, $null, 'User')
        Write-Host "  - ENV: Removed $envKey (User Scope)"
    }
}

# Save updated JSON
$newJson = $settings | ConvertTo-Json -Depth 10
$newJson | Set-Content -Path $ResolvedPath
Write-Host "Settings updated successfully."
Write-Host "NOTE: You may need to restart your terminal or VS Code for environment variables to take effect."
