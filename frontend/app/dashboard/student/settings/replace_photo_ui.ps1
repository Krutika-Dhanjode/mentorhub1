$path = "d:\mini project\web5\frontend\app\dashboard\student\settings\page.jsx"
$content = Get-Content $path -Raw
$target = '          <Section title="Photo">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex h-40 w-32 items-center justify-center overflow-hidden rounded-md border bg-muted">
                {profile.photoUrl ? (<Image src={profile.photoUrl} alt="Student photo" width={128} height={160} className="h-full w-full object-cover" unoptimized/>) : (<span className="text-sm text-muted-foreground">No photo</span>)}
              </div>
              <div className="space-y-3">
                <Label htmlFor="studentPhoto">Upload Photo</Label>
                <Input id="studentPhoto" type="file" accept="image/*" onChange={handlePhotoUpload} className="max-w-sm bg-input border-border"/>
                <p className="text-sm text-muted-foreground">
                  {isUploadingPhoto ? ''Uploading photo...'' : ''Upload a passport-size photo for the mentorship form.''}
                </p>
              </div>
            </div>
          </Section>'

$replacement = '          <Section title="Photo">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="relative group">
                <div className="w-32 h-32 bg-primary/10 rounded-full flex items-center justify-center overflow-hidden border-4 border-background shadow-md">
                  {profile.photoUrl ? (
                    <Image src={profile.photoUrl} alt="Student photo" width={128} height={128} className="w-full h-full object-cover" unoptimized />
                  ) : (
                    <User className="w-16 h-16 text-primary/40" />
                  )}
                </div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:scale-110 transition-transform disabled:opacity-50"
                  title="Change Photo"
                >
                  <Camera className="w-5 h-5" />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handlePhotoUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
              <div className="space-y-1">
                <h4 className="font-medium text-foreground">Profile Picture</h4>
                <p className="text-sm text-muted-foreground">
                  {isUploadingPhoto ? ''Uploading photo...'' : ''Upload a passport-size photo for your mentorship form.''}
                </p>
                <p className="text-xs text-muted-foreground pt-1 italic">
                  Recommended: Square image, max 2MB
                </p>
              </div>
            </div>
          </Section>'

# Use regex to find and replace
$newContent = $content -replace [regex]::Escape($target), $replacement
$newContent | Set-Content $path -NoNewline
