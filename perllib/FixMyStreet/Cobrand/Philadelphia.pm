package FixMyStreet::Cobrand::Philadelphia;
use parent 'FixMyStreet::Cobrand::Default';

use strict;
use warnings;

sub get_geocoder { 'Philadelphia' }


sub on_map_default_status { 'open' }
