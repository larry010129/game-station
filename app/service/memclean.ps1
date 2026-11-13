param([Parameter(Mandatory)][string]$Out)
# Frees RAM the way Windows Memory Cleaner's Optimize button does: it asks Windows to trim
# working sets and flush the modified, standby and file-cache lists. Needs administrator;
# when not elevated it relaunches itself once (UAC prompt) and reads the result back.
$ErrorActionPreference = 'Stop'
$admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $admin) {
  try {
    Start-Process powershell.exe -Verb RunAs -Wait -WindowStyle Hidden -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$PSCommandPath`"", '-Out', "`"$Out`"")
  } catch {
    '{"error":"Administrator permission was declined."}' | Set-Content -Path $Out -Encoding ascii
  }
} else {
  Add-Type @'
using System; using System.Runtime.InteropServices;
public static class CsMem {
  [DllImport("ntdll.dll")] static extern int NtSetSystemInformation(int cls, IntPtr buf, int len);
  [DllImport("kernel32.dll")] static extern bool SetSystemFileCacheSize(IntPtr min, IntPtr max, int flags);
  [DllImport("kernel32.dll")] static extern IntPtr GetCurrentProcess();
  [DllImport("advapi32.dll", SetLastError=true)] static extern bool OpenProcessToken(IntPtr h, uint acc, out IntPtr tok);
  [DllImport("advapi32.dll", SetLastError=true, CharSet=CharSet.Unicode)] static extern bool LookupPrivilegeValue(string sys, string name, out long luid);
  [DllImport("advapi32.dll", SetLastError=true)] static extern bool AdjustTokenPrivileges(IntPtr tok, bool dis, ref TP n, int len, IntPtr p, IntPtr r);
  [StructLayout(LayoutKind.Sequential, Pack=4)] struct TP { public int Count; public long Luid; public int Attr; }

  public static bool Priv(string name) {
    IntPtr tok; long luid;
    if (!OpenProcessToken(GetCurrentProcess(), 0x28, out tok)) return false;
    if (!LookupPrivilegeValue(null, name, out luid)) return false;
    TP tp = new TP { Count = 1, Luid = luid, Attr = 2 };
    return AdjustTokenPrivileges(tok, false, ref tp, 0, IntPtr.Zero, IntPtr.Zero) && Marshal.GetLastWin32Error() == 0;
  }
  // SystemMemoryListInformation (80): 2 working sets, 3 modified list, 4 standby, 5 low-priority standby
  public static int MemList(int cmd) {
    IntPtr p = Marshal.AllocHGlobal(4);
    try { Marshal.WriteInt32(p, cmd); return NtSetSystemInformation(80, p, 4); } finally { Marshal.FreeHGlobal(p); }
  }
  public static bool FileCache() { return SetSystemFileCacheSize(new IntPtr(-1), new IntPtr(-1), 0); }
  // SystemRegistryReconciliationInformation (155)
  public static int Registry() { return NtSetSystemInformation(155, IntPtr.Zero, 0); }
}
'@
  function Free-Mb { [math]::Round((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory / 1024) }
  try {
    $before = Free-Mb
    [void][CsMem]::Priv('SeProfileSingleProcessPrivilege')
    [void][CsMem]::Priv('SeIncreaseQuotaPrivilege')
    $done = @()
    foreach ($s in @(@('Working set', 2), @('Modified page list', 3), @('Standby list', 4), @('Standby list (low priority)', 5))) {
      if ([CsMem]::MemList($s[1]) -eq 0) { $done += $s[0] }
    }
    if ([CsMem]::FileCache()) { $done += 'System file cache' }
    if ([CsMem]::Registry() -eq 0) { $done += 'Registry cache' }
    Start-Sleep -Milliseconds 800
    $after = Free-Mb
    @{ freedMb = [int]($after - $before); freeMb = [int]$after; areas = $done } | ConvertTo-Json -Compress | Set-Content -Path $Out -Encoding ascii
  } catch {
    @{ error = $_.Exception.Message } | ConvertTo-Json -Compress | Set-Content -Path $Out -Encoding ascii
  }
}
