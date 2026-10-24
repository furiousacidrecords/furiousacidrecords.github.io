#!/usr/bin/env perl
# All 11 original electronic effects are generated in Perl, with standard modules only.
# These are synthetic sound designs, not recordings of real explosions.
use strict;
use warnings;
use File::Path qw(make_path);
my $dir = shift(@ARGV) || 'SimonSource/wwwroot/sounds';
make_path($dir);
my $rate=22050;
my $pi=4*atan2(1,1);
srand(18249);
my @effects=(
 ['red',132,.72,'thump'],['blue',580,.57,'glass'],['green',390,.64,'rise'],
 ['orange',230,.52,'spark'],['pink',760,.60,'bell'],['violet',186,.76,'wobble'],
 ['intro',220,.44,'bell'],['handoff',680,.46,'rise'],
 ['good',540,.41,'bell'],['miss',111,.37,'noise'],['finale',125,1.9,'wobble']
);
for my $design (@effects) {
 my ($name,$hz,$seconds,$kind)=@$design;
 my $count=int($rate*$seconds);
 my @samples;
 for(my $i=0;$i<$count;$i++) {
   my $t=$i/$rate; my $u=$i/$count;
   my $env=(1-exp(-$t*110))*(1-$u)**2.3;
   my $noise=2*rand()-1;
   my $f=$hz;
   my $v;
   if($kind eq 'thump') { $f=$hz*(1.3-.67*$u); $v=.7*sin(2*$pi*$f*$t)+.21*sin(2*$pi*$f*1.6*$t)+.42*$noise*exp(-$t*18); }
   elsif($kind eq 'glass') { $v=.56*sin(2*$pi*$hz*$t)+.3*sin(2*$pi*$hz*2.71*$t)+.27*sin(2*$pi*$hz*3.96*$t)+.24*$noise*exp(-$t*20); }
   elsif($kind eq 'rise') { $f=$hz*(.65+1.6*$u); $v=.68*sin(2*$pi*$f*$t)+.32*sin(2*$pi*$f*2.02*$t)+.2*$noise*exp(-$t*35); }
   elsif($kind eq 'spark') { $f=$hz*(1.8-1.05*$u); $v=.48*sin(2*$pi*$f*$t)+.30*$noise*(sin(2*$pi*27*$t)**2)+.25*sin(2*$pi*$f*4.1*$t); }
   elsif($kind eq 'bell') { $v=.66*sin(2*$pi*$hz*$t)+.35*sin(2*$pi*$hz*1.49*$t)+.13*sin(2*$pi*$hz*2.99*$t); }
   elsif($kind eq 'wobble') { $f=$hz*(1+.27*sin(2*$pi*13*$t)); $v=.75*sin(2*$pi*$f*$t)+.24*sin(2*$pi*$f*2.7*$t)+.18*$noise*exp(-$t*17); }
   else { $v=.85*$noise+.24*sin(2*$pi*$hz*$t); }
   my $value=$v*$env*.37;
   $value=$value> .85 ? .85 : $value < -.85 ? -.85 : $value;
   push @samples,int($value*32767);
 }
 my $bytes=2*@samples;
 open my $fh,'>:raw',"$dir/$name.wav" or die "$name: $!";
 print {$fh} 'RIFF',pack('V',36+$bytes),'WAVE','fmt ',pack('VvvVVvv',16,1,1,$rate,$rate*2,2,16),'data',pack('V',$bytes),pack('s<*',@samples);
 close $fh;
 print "$name.wav: ",scalar(@samples)," samples\n";
}
