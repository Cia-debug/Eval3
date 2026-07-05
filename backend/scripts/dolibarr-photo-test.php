<?php
define('NOLOGIN', 1);
define('NOREQUIREHTML', 1);
define('NOREQUIREAJAX', 1);
require 'C:/xampp/htdocs/dolibarr/htdocs/main.inc.php';
require_once DOL_DOCUMENT_ROOT.'/user/class/user.class.php';

$userobj = new User($db);
$userobj->fetch(11);

$dir = $conf->user->dir_output;
$photo = $userobj->photo;

echo "dir_output: $dir\n";
echo "user id: {$userobj->id}, rowid: {$userobj->rowid}, ref: {$userobj->ref}, photo: $photo\n";

$exdir = get_exdir(0, 0, 0, 0, $userobj, 'user');
$fileMini = $exdir.'photos/'.getImageFileNameForSize($photo, '_mini');
$fileSmall = $exdir.'photos/'.getImageFileNameForSize($photo, '_small');
$fileMain = $exdir.'photos/'.$photo;

foreach (['mini' => $fileMini, 'small' => $fileSmall, 'main' => $fileMain] as $label => $file) {
    $full = $dir.'/'.$file;
    echo "$label: $file => exists=". (file_exists($full) ? 'YES' : 'NO') . " ($full)\n";
}
